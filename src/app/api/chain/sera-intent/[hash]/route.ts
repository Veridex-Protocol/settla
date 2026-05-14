import { NextRequest, NextResponse } from 'next/server';
import { JsonRpcProvider, isHexString } from 'ethers';
import { INTENT_MATCHED_TOPIC } from '@/lib/sera/intent-hash';

/**
 * GET /api/chain/sera-intent/[hash]?fromBlock=<n>
 *
 * Watches Sepolia for the `IntentMatched(bytes32 indexed intentHash, address indexed taker,
 * uint256 legCount)` event emitted by `SeraSOR` once a swap settles, and returns the
 * settling transaction hash + block number.
 *
 * We compute `intentHash` client-side from the `/swap/quote` `route_params` (EIP-712
 * struct hash — see lib/sera/intent-hash.ts) so we don't need any owner-scoped Sera
 * API key to map a `trade_id` → on-chain hash.
 *
 * Response:
 *   { tx_hash: string, block_number: number } when matched
 *   { tx_hash: null, block_number: null }     when still pending (HTTP 200)
 *
 * Anonymous: kept under /api/chain/* which is added to middleware publicRoutes.
 */

// Sera testnet SOR contract — source of `IntentMatched`.
// From GET https://api-testnet.sera.cx/api/v1/config → sor_address.
const DEFAULT_SOR_ADDRESS = '0x83c1368110B640A729f3810De5FBe94b99aa5668';

const SOR_ADDRESS = (process.env.SERA_SOR_ADDRESS || DEFAULT_SOR_ADDRESS).toLowerCase();

// Server-side RPC: prefer Alchemy (rate-limited public node has flaky getLogs).
const RPC_URL =
  process.env.SETTLEMENT_RPC_URL ||
  process.env.ALCHEMY_SEPOLIA_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  'https://rpc.sepolia.org';

// Cap how far back we scan. The page passes a fresh fromBlock at swap time, so
// this is just a safety net for stale clients.
const MAX_LOOKBACK_BLOCKS = 5_000n;

/**
 * In-memory debounce cache. Keyed by intentHash.
 *
 * - "matched" entries are immutable (an `IntentMatched` log can't un-settle
 *   barring a deep reorg, which never affects historical Sepolia activity
 *   we're polling for). We cache them for an hour to absorb refreshes /
 *   record retries without hitting RPC.
 * - "pending" entries deduplicate concurrent poll bursts. While a payer page
 *   polls every 2s, two parallel viewers or a quick refresh collapse to one
 *   `eth_getLogs` call within the 2.5s window.
 *
 * Note: this is per-process. With multiple Next server instances each gets
 * its own cache — that's fine, the goal is per-instance debounce, not global
 * coordination. For cross-instance dedupe, swap this for Redis (Tier 1).
 */
type CacheEntry =
  | { status: 'matched'; txHash: string; blockNumber: number; expiresAt: number }
  | { status: 'pending'; expiresAt: number };

const PENDING_TTL_MS = 2_500;
const MATCHED_TTL_MS = 60 * 60 * 1_000; // 1h
const MAX_CACHE_ENTRIES = 5_000;

const intentCache = new Map<string, CacheEntry>();

function cacheGet(key: string): CacheEntry | null {
  const entry = intentCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    intentCache.delete(key);
    return null;
  }
  return entry;
}

function cacheSet(key: string, entry: CacheEntry): void {
  // Crude LRU-ish bound: if we hit the cap, drop the oldest insertion.
  // Map preserves insertion order so this is O(1).
  if (intentCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = intentCache.keys().next().value;
    if (oldest !== undefined) intentCache.delete(oldest);
  }
  intentCache.set(key, entry);
}

/**
 * In-flight request coalescing. If two payers ask for the same intentHash
 * within the same tick, they share one `eth_getLogs` round-trip.
 */
const inflight = new Map<string, Promise<CacheEntry>>();

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ hash: string }> },
) {
  const { hash } = await ctx.params;

  if (!hash || !isHexString(hash, 32)) {
    return NextResponse.json(
      { error: 'Invalid intent hash (expected 32-byte hex)' },
      { status: 400 },
    );
  }

  const intentHash = hash.toLowerCase();
  const fromBlockParam = req.nextUrl.searchParams.get('fromBlock');

  // 1) Fast path: cached settlement (matched results live 1h, pending 2.5s).
  const cached = cacheGet(intentHash);
  if (cached) {
    if (cached.status === 'matched') {
      return NextResponse.json({
        tx_hash: cached.txHash,
        block_number: cached.blockNumber,
        cached: true,
      });
    }
    // Pending — still inside debounce window, skip RPC.
    return NextResponse.json({ tx_hash: null, block_number: null, cached: true });
  }

  // 2) Coalesce concurrent identical lookups into a single RPC round-trip.
  let pending = inflight.get(intentHash);
  if (!pending) {
    pending = (async (): Promise<CacheEntry> => {
      const provider = new JsonRpcProvider(RPC_URL);
      const latest = BigInt(await provider.getBlockNumber());

      let fromBlock: bigint;
      if (fromBlockParam) {
        const parsed = BigInt(fromBlockParam);
        const earliestAllowed =
          latest > MAX_LOOKBACK_BLOCKS ? latest - MAX_LOOKBACK_BLOCKS : 0n;
        fromBlock = parsed < earliestAllowed ? earliestAllowed : parsed;
      } else {
        fromBlock = latest > MAX_LOOKBACK_BLOCKS ? latest - MAX_LOOKBACK_BLOCKS : 0n;
      }

      const logs = await provider.getLogs({
        address: SOR_ADDRESS,
        topics: [INTENT_MATCHED_TOPIC, intentHash],
        fromBlock: '0x' + fromBlock.toString(16),
        toBlock: '0x' + latest.toString(16),
      });

      if (logs.length === 0) {
        const entry: CacheEntry = {
          status: 'pending',
          expiresAt: Date.now() + PENDING_TTL_MS,
        };
        cacheSet(intentHash, entry);
        return entry;
      }

      // If >1 match (shouldn't happen — intentHash is unique), prefer earliest.
      const first = logs.reduce((a, b) => (a.blockNumber <= b.blockNumber ? a : b));
      const entry: CacheEntry = {
        status: 'matched',
        txHash: first.transactionHash,
        blockNumber: first.blockNumber,
        expiresAt: Date.now() + MATCHED_TTL_MS,
      };
      cacheSet(intentHash, entry);
      return entry;
    })().finally(() => {
      inflight.delete(intentHash);
    });
    inflight.set(intentHash, pending);
  }

  try {
    const entry = await pending;
    if (entry.status === 'matched') {
      return NextResponse.json({
        tx_hash: entry.txHash,
        block_number: entry.blockNumber,
      });
    }
    return NextResponse.json({ tx_hash: null, block_number: null });
  } catch (error) {
    console.error('[SERA_INTENT_STATUS]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chain lookup failed' },
      { status: 502 },
    );
  }
}
