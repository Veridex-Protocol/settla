'use client';

import { ethers } from 'ethers';
import { seraService, SERA_CONFIG } from './sera-client';
import type { LimitParams } from './sera';
import type { SeraOpenOrder, SeraMarket } from './sera/types';

// Settlement status tracking
export type SettlementStatus = 
  | 'pending'        // Payment received, waiting to settle
  | 'placing_order'  // Placing settlement order on Sera
  | 'order_placed'   // Order placed, waiting for fill
  | 'partially_filled' // Order partially filled
  | 'filled'         // Order completely filled
  | 'claiming'       // Claiming proceeds
  | 'settled'        // Settlement complete
  | 'failed';        // Settlement failed

export interface SettlementRecord {
  id: string;
  idempotencyKey: string;
  paymentTxHash: string;
  paymentAmount: string;
  paymentToken: string;
  settlementToken: string;
  status: SettlementStatus;
  seraOrderId?: string;
  seraOrderNftId?: string;
  claimTxHash?: string;
  settlementTxHash?: string;
  settledAmount?: string;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

// Maximum settlement polling duration (1 hour)
const MAX_POLLING_DURATION_MS = 60 * 60 * 1000;
// Initial poll interval (5 seconds)
const INITIAL_POLL_INTERVAL_MS = 5_000;
// Max poll interval (60 seconds)
const MAX_POLL_INTERVAL_MS = 60_000;
// Default slippage tolerance (0.5%)
const DEFAULT_SLIPPAGE_BPS = 50;

/** Structured audit log for financial events */
function auditLog(event: string, data: Record<string, unknown>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...data,
  };
  // Structured JSON — queryable by log aggregators
  console.log(JSON.stringify(entry));
}

export interface SettlementParams {
  paymentTxHash: string;
  paymentAmount: string;
  paymentToken: string;  // Token received (e.g., USDC)
  settlementToken: string;  // Token to settle to (e.g., EURC)
  merchantAddress: string;
}

// Convert amount to raw amount for Sera
function toRawAmount(amount: string, quoteUnit: bigint): bigint {
  const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1_000_000)); // 6 decimals
  return amountBigInt / quoteUnit;
}

// Calculate price index from desired price
function toPriceIndex(price: number, minPrice: number, tickSpace: number): number {
  return Math.round((price - minPrice) / tickSpace);
}

export class SettlementService {
  private settlements: Map<string, SettlementRecord> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  /** Locks per session to prevent concurrent settlement race conditions (VDX-PAY-001) */
  private activeLocks: Set<string> = new Set();
  /** Idempotency index: paymentTxHash → settlementId (VDX-PAY-007) */
  private idempotencyIndex: Map<string, string> = new Map();

  /**
   * Initialize settlement for a payment.
   * Uses mutex locking per paymentTxHash to prevent double-spend (VDX-PAY-001).
   * Uses paymentTxHash as idempotency key to prevent duplicate settlements (VDX-PAY-007).
   */
  async initiateSettlement(
    signer: ethers.Signer,
    params: SettlementParams
  ): Promise<SettlementRecord> {
    // VDX-PAY-007: Check idempotency — return existing record if already initiated
    const existingId = this.idempotencyIndex.get(params.paymentTxHash);
    if (existingId) {
      const existing = this.settlements.get(existingId);
      if (existing) {
        auditLog('settlement.idempotent_hit', {
          settlementId: existingId,
          paymentTxHash: params.paymentTxHash,
          status: existing.status,
        });
        return existing;
      }
    }

    // VDX-PAY-001: Acquire lock to prevent concurrent settlements for same payment
    const lockKey = params.paymentTxHash;
    if (this.activeLocks.has(lockKey)) {
      throw new Error('Settlement already in progress for this payment');
    }
    this.activeLocks.add(lockKey);

    const settlementId = `settle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    // Create settlement record with idempotency key and proof fields (VDX-PAY-017)
    const record: SettlementRecord = {
      id: settlementId,
      idempotencyKey: params.paymentTxHash,
      paymentTxHash: params.paymentTxHash,
      paymentAmount: params.paymentAmount,
      paymentToken: params.paymentToken,
      settlementToken: params.settlementToken,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    this.settlements.set(settlementId, record);
    this.idempotencyIndex.set(params.paymentTxHash, settlementId);

    auditLog('settlement.initiated', {
      settlementId,
      paymentTxHash: params.paymentTxHash,
      paymentAmount: params.paymentAmount,
      paymentToken: params.paymentToken,
      settlementToken: params.settlementToken,
      merchantAddress: params.merchantAddress,
    });
    
    try {
      // 1. Get market info
      const markets = await seraService.getMarkets();
      const market = this.findMarket(markets, params.paymentToken, params.settlementToken);
      
      if (!market) {
        throw new Error(`No market found for ${params.paymentToken}/${params.settlementToken}`);
      }

      // 2. Update status to placing order
      this.updateSettlement(settlementId, { status: 'placing_order' });

      // 3. Calculate order parameters
      const quoteUnit = BigInt(market.quoteUnit);
      const rawAmount = toRawAmount(params.paymentAmount, quoteUnit);
      
      // Use current market price (in production, you might want slight slippage)
      const priceIndex = market.latestPriceIndex ? parseInt(market.latestPriceIndex) : 0;
      
      // 4. Prepare limit order params
      const orderParams: LimitParams = {
        market: market.id,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
        claimBounty: 0,
        user: await signer.getAddress(),
        priceIndex: priceIndex,
        rawAmount: rawAmount,
        postOnly: false,
        useNative: false,
        baseAmount: 0n,
      };

      // 5. First approve the token (VDX-PAY-010: only approve exact needed amount)
      await this.approveToken(signer, params.paymentToken, rawAmount * quoteUnit);

      // 6. Place the settlement order
      const tx = await seraService.placeSettlementOrder(signer, orderParams);
      const receipt = await tx.wait();

      // 7. Store tx hash as cryptographic proof of on-chain execution (VDX-PAY-017)
      this.updateSettlement(settlementId, {
        status: 'order_placed',
        seraOrderId: receipt.hash,
        settlementTxHash: receipt.hash,
      });

      auditLog('settlement.order_placed', {
        settlementId,
        txHash: receipt.hash,
        marketId: market.id,
        priceIndex,
        rawAmount: rawAmount.toString(),
      });

      // 8. Start polling for order fill (VDX-PAY-015: bounded polling)
      this.startPolling(settlementId, await signer.getAddress(), market.id);

      return this.settlements.get(settlementId)!;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateSettlement(settlementId, {
        status: 'failed',
        error: errorMessage,
      });
      auditLog('settlement.failed', {
        settlementId,
        error: errorMessage,
        paymentTxHash: params.paymentTxHash,
      });
      throw error;
    } finally {
      // VDX-PAY-001: Release lock
      this.activeLocks.delete(lockKey);
    }
  }

  /**
   * Approve token for Sera Router
   */
  private async approveToken(signer: ethers.Signer, tokenAddress: string, amount: bigint): Promise<void> {
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function allowance(address owner, address spender) view returns (uint256)',
    ];
    
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
    const signerAddress = await signer.getAddress();
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(signerAddress, SERA_CONFIG.routerAddress);
    
    if (currentAllowance < amount) {
      const approveTx = await tokenContract.approve(SERA_CONFIG.routerAddress, amount);
      await approveTx.wait();
    }
  }

  /**
   * Find matching market for token pair
   */
  private findMarket(markets: SeraMarket[], quoteToken: string, baseToken: string): SeraMarket | null {
    // Normalize token symbols
    const quoteSymbol = quoteToken.toUpperCase();
    const baseSymbol = baseToken.toUpperCase();
    
    return markets.find(m => 
      (m.quoteToken.symbol.toUpperCase() === quoteSymbol && 
       m.baseToken.symbol.toUpperCase() === baseSymbol) ||
      (m.quoteToken.symbol.toUpperCase() === baseSymbol && 
       m.baseToken.symbol.toUpperCase() === quoteSymbol)
    ) || null;
  }

  /**
   * Start polling for order status.
   * VDX-PAY-015: Bounded duration with exponential backoff.
   */
  private startPolling(settlementId: string, userAddress: string, marketId: string): void {
    const startedAt = Date.now();
    let currentInterval = INITIAL_POLL_INTERVAL_MS;

    const poll = async () => {
      const record = this.settlements.get(settlementId);
      if (!record || record.status === 'settled' || record.status === 'failed') {
        return; // Stop polling — terminal state
      }

      // VDX-PAY-015: Check max polling duration
      if (Date.now() - startedAt > MAX_POLLING_DURATION_MS) {
        auditLog('settlement.polling_timeout', {
          settlementId,
          durationMs: Date.now() - startedAt,
        });
        this.updateSettlement(settlementId, {
          status: 'failed',
          error: 'Settlement polling timed out after maximum duration',
        });
        return;
      }

      try {
        const orders = await seraService.getOpenOrders(userAddress);
        const marketOrders = orders.filter(o => o.market === marketId);
        
        if (marketOrders.length === 0) {
          this.updateSettlement(settlementId, { status: 'filled' });
          auditLog('settlement.filled', { settlementId });
          return;
        }

        const latestOrder = marketOrders[0];
        if (latestOrder.status === 'filled') {
          this.updateSettlement(settlementId, {
            status: 'filled',
            seraOrderNftId: latestOrder.nftId?.toString(),
          });
          auditLog('settlement.filled', { settlementId, nftId: latestOrder.nftId });
        } else if (latestOrder.status === 'partial') {
          this.updateSettlement(settlementId, {
            status: 'partially_filled',
            seraOrderNftId: latestOrder.nftId?.toString(),
          });
        }

        // Exponential backoff: double interval each iteration, capped
        currentInterval = Math.min(currentInterval * 2, MAX_POLL_INTERVAL_MS);
        setTimeout(poll, currentInterval);
      } catch (error) {
        auditLog('settlement.polling_error', {
          settlementId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
        currentInterval = Math.min(currentInterval * 2, MAX_POLL_INTERVAL_MS);
        setTimeout(poll, currentInterval);
      }
    };

    setTimeout(poll, INITIAL_POLL_INTERVAL_MS);
  }

  /**
   * Claim proceeds from a filled order
   */
  async claimSettlement(
    signer: ethers.Signer,
    settlementId: string
  ): Promise<SettlementRecord> {
    const record = this.settlements.get(settlementId);
    if (!record) {
      throw new Error('Settlement not found');
    }

    if (record.status !== 'filled' && record.status !== 'partially_filled') {
      throw new Error('Settlement not ready to claim');
    }

    this.updateSettlement(settlementId, { status: 'claiming' });

    try {
      // Get filled orders to claim
      const userAddress = await signer.getAddress();
      const orders = await seraService.getOpenOrders(userAddress);
      
      // Build claim params
      const claimParams = orders
        .filter(o => o.claimableAmount && BigInt(o.claimableAmount) > 0n)
        .map(o => ({
          market: o.market || '',
          orderKeys: [{
            isBid: o.isBid,
            priceIndex: parseInt(o.priceIndex),
            orderIndex: o.nftId ? parseInt(o.nftId) : 0, // Simplified - actual index needed
          }],
        }));

      if (claimParams.length === 0) {
        throw new Error('No claimable proceeds');
      }

      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const tx = await seraService.claimProceeds(signer, deadline, claimParams);
      const receipt = await tx.wait();

      // VDX-PAY-017: Store claim tx hash as cryptographic proof
      this.updateSettlement(settlementId, {
        status: 'settled',
        claimTxHash: receipt.hash,
      });

      auditLog('settlement.claimed', {
        settlementId,
        claimTxHash: receipt.hash,
        userAddress,
      });

      return this.settlements.get(settlementId)!;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateSettlement(settlementId, {
        status: 'failed',
        error: errorMessage,
      });
      auditLog('settlement.claim_failed', {
        settlementId,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Get settlement status
   */
  getSettlement(settlementId: string): SettlementRecord | undefined {
    return this.settlements.get(settlementId);
  }

  /**
   * List all settlements for a merchant
   */
  listSettlements(): SettlementRecord[] {
    return Array.from(this.settlements.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  /**
   * Update settlement record
   */
  private updateSettlement(id: string, updates: Partial<SettlementRecord>): void {
    const record = this.settlements.get(id);
    if (record) {
      this.settlements.set(id, {
        ...record,
        ...updates,
        updatedAt: new Date(),
      });
    }
  }
}

// Singleton instance
export const settlementService = new SettlementService();
