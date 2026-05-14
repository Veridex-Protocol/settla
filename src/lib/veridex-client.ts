'use client';

import { browserSupportsWebAuthn } from '@simplewebauthn/browser';
import {
  clearActiveCredential as secureClearActive,
  getActiveCredential as secureGetActive,
  hasAnyCredentialSync,
  loadCredentialBlob,
  setActiveCredential as secureSetActive,
  upsertCredentials,
  wipeAllCredentials,
  type StoredPasskeyCredential,
} from './secure-credential-store';

// NO imports from @veridex/sdk at the top level - even type imports can cause SSR issues
// All SDK access is done through dynamic imports

// Lazy-loaded SDK module
let sdkModule: Awaited<typeof import('@veridex/sdk')> | null = null;

// SDK singleton instance (using any to avoid importing types at top level)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sdkInstance: any = null;

// Store prepared transfers for the execute step (using unknown to avoid type mismatch with SDK)
const preparedTransfers = new Map<string, unknown>();

// Chain configuration for Sera
// - Hub Chain: Base Sepolia (for passkey authentication, VeridexHub contract)
// - Transaction Chain: Ethereum Sepolia (where Sera stablecoins are deployed)
//
// Base Sepolia has:
// - VeridexHub contract for passkey authentication
// - RIP-7212 precompile for efficient P256 verification (~3,450 gas)
//
// Ethereum Sepolia has:
// - VaultFactory for smart contract wallet creation
// - Sera stablecoins (USDC, etc.) for payments
const SERA_HUB_CHAIN = 'base' as const;
const SERA_TRANSACTION_CHAIN = 'ethereum' as const;
const SERA_NETWORK = 'testnet' as const;

// Ethereum Sepolia contracts for vault address derivation
// These are used to compute the deterministic vault address (CREATE2)
const ETH_SEPOLIA_VAULT_FACTORY = '0x07F608AFf6d63b68029488b726d895c4Bb593038';
const ETH_SEPOLIA_VAULT_IMPLEMENTATION = '0xD66153fccFB6731fB6c4944FbD607ba86A76a1f6';

// Relayer configuration (optional for gasless transactions)
const RELAYER_URL = process.env.NEXT_PUBLIC_VERIDEX_RELAYER_URL;
const RELAYER_API_KEY = process.env.NEXT_PUBLIC_VERIDEX_RELAYER_API_KEY;

/**
 * Dynamically load the SDK module (client-side only)
 */
async function loadSDKModule() {
  if (!sdkModule) {
    // Dynamic import ensures this only runs on the client
    sdkModule = await import('@veridex/sdk');
  }
  return sdkModule;
}

/**
 * Compute the Ethereum Sepolia vault address for a given keyHash
 * This is the address where users receive/send Sera stablecoins
 */
async function computeEthSepoliaVaultAddress(keyHash: string): Promise<string> {
  const { WalletManager } = await loadSDKModule();
  const walletManager = new WalletManager({ cacheAddresses: true, persistToStorage: false });
  return walletManager.computeVaultAddress(
    keyHash,
    ETH_SEPOLIA_VAULT_FACTORY,
    ETH_SEPOLIA_VAULT_IMPLEMENTATION
  );
}

/**
 * Get or create the Veridex SDK instance
 * Uses singleton pattern to maintain state across the app
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getVeridexSDK(): Promise<any> {
  if (!sdkInstance) {
    const { createSDK } = await loadSDKModule();
    sdkInstance = createSDK(SERA_HUB_CHAIN, {
      network: SERA_NETWORK,
      ...(RELAYER_URL && { relayerUrl: RELAYER_URL }),
      ...(RELAYER_API_KEY && { relayerApiKey: RELAYER_API_KEY }),
    });
  }
  return sdkInstance;
}

/**
 * Reset the SDK instance (for testing or re-initialization)
 */
export function resetVeridexSDK(): void {
  sdkInstance = null;
  preparedTransfers.clear();
}

/**
 * Veridex Passkey Registration
 * Registers a new passkey credential for the user
 */
export async function registerPasskey(
  username: string,
  displayName?: string
): Promise<{
  address: string;
  hubAddress: string;
  keyHash: string;
  credentialId: string;
}> {
  const sdk = await getVeridexSDK();

  // Register passkey using WebAuthn (via Base hub)
  const credential = await sdk.passkey.register(username, displayName || username);

  // Sync the new credential to our backend for recovery/multi-device support
  await syncCredentialToBackend(credential);

  // Get the Base hub vault address (for authentication)
  const hubAddress = sdk.getVaultAddress();

  // Compute the Ethereum Sepolia vault address (for Sera transactions)
  const vaultAddress = await computeEthSepoliaVaultAddress(credential.keyHash);

  return {
    address: vaultAddress, // Ethereum Sepolia address for Sera
    hubAddress, // Base address for reference
    keyHash: credential.keyHash,
    credentialId: credential.credentialId,
  };
}

/**
 * Veridex Passkey Authentication
 * Authenticates with an existing passkey
 */
export async function authenticateWithPasskey(): Promise<{
  address: string;
  hubAddress: string;
  keyHash: string;
  credentialId: string;
}> {
  const sdk = await getVeridexSDK();

  // Try to fetch credentials from backend first to ensure we have the latest list
  await fetchBackendCredentials(sdk);

  // Authenticate with existing passkey (via Base hub)
  const result = await sdk.passkey.authenticate();

  // Mirror into the encrypted store and drop any plaintext copy the SDK
  // may have written internally.
  try {
    await upsertCredentials([
      {
        credentialId: result.credential.credentialId,
        publicKeyX: result.credential.publicKeyX.toString(),
        publicKeyY: result.credential.publicKeyY.toString(),
        keyHash: result.credential.keyHash,
      },
    ]);
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('veridex_credentials'); } catch {}
    }
  } catch (e) {
    console.warn('[veridex-client] Failed to mirror authenticated credential:', e);
  }

  // Get the Base hub vault address (for authentication)
  const hubAddress = sdk.getVaultAddress();

  // Compute the Ethereum Sepolia vault address (for Sera transactions)
  const vaultAddress = await computeEthSepoliaVaultAddress(result.credential.keyHash);

  return {
    address: vaultAddress, // Ethereum Sepolia address for Sera
    hubAddress, // Base address for reference
    keyHash: result.credential.keyHash,
    credentialId: result.credential.credentialId,
  };
}

/**
 * Get the Ethereum Sepolia vault address for the current user
 * Call this after authentication to get the address for Sera transactions
 */
export async function getSeraVaultAddress(): Promise<string | null> {
  const sdk = await getVeridexSDK();
  const credential = sdk.passkey.getCredential();
  if (!credential) {
    return null;
  }
  return computeEthSepoliaVaultAddress(credential.keyHash);
}

/**
 * Get the Base hub vault address for the current user
 * This is the address on the hub chain for authentication
 */
export async function getHubVaultAddress(): Promise<string | null> {
  const sdk = await getVeridexSDK();
  try {
    return sdk.getVaultAddress();
  } catch {
    return null;
  }
}

/**
 * Sign a challenge using passkey
 */
export async function signWithPasskey(challenge: Uint8Array): Promise<{
  authenticatorData: string;
  clientDataJSON: string;
  challengeIndex: number;
  typeIndex: number;
  r: bigint;
  s: bigint;
}> {
  const sdk = await getVeridexSDK();

  // Sign the challenge
  const result = await sdk.passkey.sign(challenge);

  return result;
}

/**
 * Generate a unique transfer ID
 */
function generateTransferId(): string {
  return `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Prepare a transfer for signing
 * Returns a transferId that can be used with executeTransfer
 */
export async function prepareTransfer(params: {
  to: string;
  amount: string;
  token?: string; // Token symbol (e.g. 'USDC') or address
}): Promise<{
  transferId: string;
  challenge: Uint8Array;
  estimatedGas: string;
  messageFee: string;
}> {
  const sdk = await getVeridexSDK();
  const { ethers } = await import('ethers');
  const { SERA_TOKENS } = await import('./tokens');

  // Sera Protocol payments always target Ethereum Sepolia (10002)
  const targetChain = 10002;

  let tokenAddress = '0x0000000000000000000000000000000000000000';
  let tokenDecimals = 18;

  // Resolve token symbol to address and decimals
  if (params.token) {
    // Check if it's a known symbol in our registry
    const tokenInfo = SERA_TOKENS[params.token.toUpperCase()];
    if (tokenInfo) {
      tokenAddress = tokenInfo.address;
      tokenDecimals = tokenInfo.decimals;
    } else {
      // If not in registry, assume it's a raw address (fallback)
      tokenAddress = params.token;
      // Default to 18 decimals if unknown, or maybe 6 for stablecoins? 
      // Safest to default to 18 but warn this path is risky if not a symbol.
    }
  }

  // Parse human-readable amount to atomic units (bigint)
  // e.g. "100" USDC -> 100000000n (6 decimals)
  const amountBigInt = ethers.parseUnits(params.amount, tokenDecimals);

  console.log('[veridex-client] Preparing transfer:', {
    to: params.to,
    amountHuman: params.amount,
    amountRaw: amountBigInt.toString(),
    token: params.token,
    tokenAddress,
    targetChain
  });

  const prepared = await sdk.prepareTransfer({
    recipient: params.to,
    amount: amountBigInt,
    token: tokenAddress,
    targetChain: targetChain,
  });

  // Generate ID and store for later execution
  const transferId = generateTransferId();
  preparedTransfers.set(transferId, prepared as any);

  // Clean up old transfers after 10 minutes
  setTimeout(() => {
    preparedTransfers.delete(transferId);
  }, 10 * 60 * 1000);

  return {
    transferId,
    challenge: prepared.challenge,
    estimatedGas: prepared.estimatedGas.toString(),
    messageFee: prepared.messageFee.toString(),
  };
}

/**
 * Execute a prepared and signed transfer
 */
export async function executeSignedTransfer(
  transferId: string,
  signature: {
    authenticatorData: string;
    clientDataJSON: string;
    challengeIndex: number;
    typeIndex: number;
    r: bigint;
    s: bigint;
  }
): Promise<{
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  sequence?: string;
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prepared = preparedTransfers.get(transferId) as any;

  if (!prepared) {
    throw new Error('Transfer not found or expired');
  }

  const sdk = await getVeridexSDK();

  // Clean up the prepared transfer
  preparedTransfers.delete(transferId);

  // Check if relayer is configured
  if (!RELAYER_URL) {
    throw new Error('Relayer not configured. Set NEXT_PUBLIC_VERIDEX_RELAYER_URL environment variable.');
  }

  try {
    // The prepared object from SDK has params nested inside 'params' property
    const params = prepared.params || prepared;

    // Execute the actual transfer via the SDK's relayer integration
    const result = await sdk.transferViaRelayer({
      recipient: params.recipient,
      amount: params.amount,
      token: params.token,
      targetChain: params.targetChain,
    });

    return {
      txHash: result.transactionHash,
      status: 'pending', // Transaction is submitted, waiting for confirmation
      sequence: result.sequence?.toString(), // Return sequence for status polling
    };
  } catch (error) {
    console.error('Transfer via relayer failed:', error);
    throw new Error(`Transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Transaction completion status from relayer
 */
export interface TransactionCompletionStatus {
  found: boolean;
  status?: 'pending' | 'completed' | 'failed';
  targetTxHash?: string;
  hubTxHash?: string;
  sequence?: string;
  errorMessage?: string;
  completedAt?: number;
}

/**
 * Poll the relayer for transaction completion status
 * Returns the final target chain transaction hash once execution is complete
 * 
 * @param sequenceOrHubTx - Either the Wormhole sequence number or the Hub transaction hash
 * @param options - Polling options
 * @returns Transaction completion status with target tx hash
 */
export async function pollForTransactionCompletion(
  sequenceOrHubTx: string,
  options: {
    maxAttempts?: number;
    intervalMs?: number;
    type?: 'sequence' | 'hub';
  } = {}
): Promise<TransactionCompletionStatus> {
  const maxAttempts = options.maxAttempts ?? 30; // Default 30 attempts
  const intervalMs = options.intervalMs ?? 3000; // Default 3 seconds
  const type = options.type ?? (sequenceOrHubTx.startsWith('0x') ? 'hub' : 'sequence');

  if (!RELAYER_URL) {
    return { found: false };
  }

  const endpoint = type === 'sequence'
    ? `${RELAYER_URL}/api/v1/tx-status/sequence/${sequenceOrHubTx}`
    : `${RELAYER_URL}/api/v1/tx-status/hub/${sequenceOrHubTx}`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(endpoint);

      if (!response.ok) {
        console.warn(`Poll attempt ${attempt}: HTTP ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      const data = await response.json();

      if (!data.found) {
        // Transaction not recorded yet, keep polling
        console.log(`Poll attempt ${attempt}: Transaction not found yet`);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        continue;
      }

      // Check status
      if (data.status === 'completed') {
        console.log(`Poll attempt ${attempt}: Transaction completed`, data.targetTxHash);
        return {
          found: true,
          status: 'completed',
          targetTxHash: data.targetTxHash,
          hubTxHash: data.hubTxHash,
          sequence: data.sequence,
          completedAt: data.completedAt,
        };
      }

      if (data.status === 'failed') {
        console.warn(`Poll attempt ${attempt}: Transaction failed`, data.errorMessage);
        return {
          found: true,
          status: 'failed',
          hubTxHash: data.hubTxHash,
          sequence: data.sequence,
          errorMessage: data.errorMessage,
        };
      }

      // Still pending, keep polling
      console.log(`Poll attempt ${attempt}: Transaction pending`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      console.warn(`Poll attempt ${attempt}: Error`, error);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }

  // Max attempts reached
  console.warn(`Max polling attempts (${maxAttempts}) reached`);
  return { found: false };
}

/**
 * Get wallet balance
 */
export async function getBalance(
  address: string,
  token?: string
): Promise<{
  balance: string;
  decimals: number;
  symbol: string;
}> {
  const sdk = await getVeridexSDK();

  try {
    const chainId = sdk.getChainConfig().wormholeChainId;
    const portfolio = await sdk.balance.getPortfolioBalance(chainId, address);
    const balances = portfolio.tokens;

    if (token) {
      const tokenBalance = balances.find((b: { token: { address: string; decimals: number; symbol: string }; formatted: string }) =>
        b.token.address.toLowerCase() === token.toLowerCase()
      );
      if (tokenBalance) {
        return {
          balance: tokenBalance.formatted, // formatted is string
          decimals: tokenBalance.token.decimals,
          symbol: tokenBalance.token.symbol,
        };
      }
    }

    // Return first balance (usually native if sorted, or just first) or default
    if (balances.length > 0) {
      // Prefer native token if available
      const native = balances.find((b: { token: { isNative: boolean; decimals: number; symbol: string }; formatted: string }) => b.token.isNative);
      if (native) {
        return {
          balance: native.formatted,
          decimals: native.token.decimals,
          symbol: native.token.symbol,
        };
      }

      const first = balances[0];
      return {
        balance: first.formatted,
        decimals: first.token.decimals,
        symbol: first.token.symbol,
      };
    }

    return {
      balance: '0',
      decimals: 18,
      symbol: 'ETH',
    };
  } catch (error) {
    console.error('Failed to get balance:', error);
    return {
      balance: '0',
      decimals: 18,
      symbol: 'ETH',
    };
  }
}

/**
 * Get token balance for payment validation
 * Checks the user's Ethereum Sepolia vault for the specified Sera token balance
 * 
 * @param tokenSymbol - Token symbol like 'USDC', 'USDT', etc.
 * @returns Balance info including raw balance in smallest units
 */
export async function getTokenBalanceForPayment(
  tokenSymbol: string
): Promise<{
  balance: bigint;
  formatted: string;
  decimals: number;
  symbol: string;
  hasSufficientBalance: (requiredAmount: string) => boolean;
}> {
  const sdk = await getVeridexSDK();

  // Import ethers for direct RPC queries
  const { ethers } = await import('ethers');

  // Import Sera token registry
  const { SERA_TOKENS } = await import('./tokens');

  try {
    // Get the user's credential to compute their Ethereum Sepolia vault address
    const credential = sdk.passkey.getCredential();
    if (!credential) {
      console.error('[veridex-client] No credential available for balance check');
      return {
        balance: 0n,
        formatted: '0',
        decimals: 6,
        symbol: tokenSymbol,
        hasSufficientBalance: () => false,
      };
    }

    // Compute the Ethereum Sepolia vault address (where Sera tokens are)
    const vaultAddress = await computeEthSepoliaVaultAddress(credential.keyHash);

    // Get the Sera token info from our registry
    const tokenInfo = SERA_TOKENS[tokenSymbol.toUpperCase()];
    if (!tokenInfo) {
      console.warn(`[veridex-client] Token ${tokenSymbol} not found in Sera registry`);
      return {
        balance: 0n,
        formatted: '0',
        decimals: 6,
        symbol: tokenSymbol,
        hasSufficientBalance: () => false,
      };
    }

    console.log(`[veridex-client] Checking ${tokenSymbol} balance at ${vaultAddress} (Ethereum Sepolia)`);
    console.log(`[veridex-client] Token contract: ${tokenInfo.address}`);

    // Create provider for Ethereum Sepolia
    const rpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // ERC20 balanceOf ABI
    const erc20Abi = ['function balanceOf(address) view returns (uint256)'];
    const tokenContract = new ethers.Contract(tokenInfo.address, erc20Abi, provider);

    // Query the balance
    const rawBalance: bigint = await tokenContract.balanceOf(vaultAddress);
    const decimals = tokenInfo.decimals;
    const formatted = ethers.formatUnits(rawBalance, decimals);

    // Debug logging for balance discrepancies (enable via NEXT_PUBLIC_DEBUG_BALANCE env var)
    if (typeof window !== 'undefined' && window.location.search.includes('debug_balance=1')) {
      console.group(`[DEBUG] Balance Lookup for ${tokenSymbol}`);
      console.log('  Vault Address:', vaultAddress);
      console.log('  Token Contract:', tokenInfo.address);
      console.log('  Token Decimals:', decimals);
      console.log('  Raw Balance:', rawBalance.toString());
      console.log('  Formatted Balance:', formatted);
      console.log('  Expected Format:', `${formatted} ${tokenSymbol}`);
      console.groupEnd();
    }

    console.log(`[veridex-client] Balance result: ${formatted} ${tokenSymbol} (raw: ${rawBalance}); vault: ${vaultAddress}`);

    return {
      balance: rawBalance,
      formatted,
      decimals,
      symbol: tokenInfo.symbol,
      hasSufficientBalance: (requiredAmount: string) => {
        const required = BigInt(Math.floor(parseFloat(requiredAmount) * Math.pow(10, decimals)));
        return rawBalance >= required;
      },
    };
  } catch (error) {
    console.error('[veridex-client] Failed to get token balance for payment:', error);
    return {
      balance: 0n,
      formatted: '0',
      decimals: 6,
      symbol: tokenSymbol,
      hasSufficientBalance: () => false,
    };
  }
}

/**
 * Check if the browser supports passkeys
 * Uses @simplewebauthn/browser for comprehensive cross-browser and mobile support
 */
export function isPasskeySupported(): boolean {
  if (typeof window === 'undefined') return false;

  // Use the simplewebauthn library for better mobile browser compatibility
  // This handles edge cases on iOS Safari, Android Chrome, etc.
  return browserSupportsWebAuthn();
}

/**
 * Check (synchronously) if user has any stored passkey credentials.
 * Best-effort during initial render; the async path corrects later.
 */
export function hasStoredCredentials(): boolean {
  return hasAnyCredentialSync();
}

/**
 * Persist the "active" credential pointer in the encrypted blob.
 * NOTE: the actual credential set is upserted separately via the SDK sync path.
 */
export function storeCredentialInfo(info: {
  address: string;
  credentialId: string;
}): void {
  void secureSetActive(info).catch((e) =>
    console.warn('[veridex-client] storeCredentialInfo failed:', e),
  );
}

/**
 * Get the active credential pointer (synchronous best-effort wrapper around
 * the encrypted store). Returns null if not yet hydrated; the async
 * `getStoredCredentialInfoAsync` is preferred.
 */
export function getStoredCredentialInfo(): {
  address: string;
  credentialId: string;
} | null {
  if (typeof window === 'undefined') return null;
  // Synchronous path: callers should treat this as a hint only.
  // The wallet-context useEffect will hydrate the real value asynchronously.
  return null;
}

export async function getStoredCredentialInfoAsync(): Promise<{
  address: string;
  credentialId: string;
} | null> {
  const active = await secureGetActive();
  return active ?? null;
}

/**
 * Logout helper. Does NOT delete the stored credential set — only clears the
 * "active" pointer so the next login can re-bind. Credentials remain
 * encrypted at rest so the user does not have to re-register a passkey.
 */
export function clearStoredCredentialInfo(): void {
  void secureClearActive().catch((e) =>
    console.warn('[veridex-client] clearStoredCredentialInfo failed:', e),
  );
}

/**
 * Hard wipe: forget this device entirely. Drops the encrypted credential
 * blob and the device key. Triggered only by an explicit "forget device"
 * action.
 */
export async function forgetThisDevice(): Promise<void> {
  await wipeAllCredentials();
}

/**
 * Restore the SDK credential after a page reload or fresh login.
 *
 * Order of precedence:
 *   1. SDK already has a credential in memory — nothing to do.
 *   2. Encrypted local blob — hydrate the SDK from the active credential,
 *      or fall back to the first stored credential.
 *   3. Relayer lookup (last resort, requires network).
 *
 * @returns true if credential was restored, false otherwise
 */
export async function restoreSDKCredential(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const sdk = await getVeridexSDK();

    // 1. Already restored?
    if (sdk.passkey.getCredential()) {
      return true;
    }

    // 2. Encrypted local blob.
    const blob = await loadCredentialBlob();
    if (blob.credentials.length > 0) {
      const activeId = blob.lastActive?.credentialId;
      const chosen =
        (activeId && blob.credentials.find((c) => c.credentialId === activeId)) ||
        blob.credentials[0];
      try {
        sdk.passkey.createCredentialFromPublicKey(
          chosen.credentialId,
          BigInt(chosen.publicKeyX),
          BigInt(chosen.publicKeyY),
        );
        console.log('[veridex-client] Restored SDK credential from encrypted store');
        return true;
      } catch (e) {
        console.warn('[veridex-client] Encrypted store credential rejected by SDK:', e);
      }
    }

    // 3. Relayer fallback.
    const active = await secureGetActive();
    if (active?.credentialId && RELAYER_URL) {
      try {
        const response = await fetch(
          `${RELAYER_URL}/api/v1/credential/by-id/${encodeURIComponent(active.credentialId)}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.exists && data.publicKeyX && data.publicKeyY && data.keyHash) {
            sdk.passkey.createCredentialFromPublicKey(
              data.credentialId,
              BigInt(data.publicKeyX),
              BigInt(data.publicKeyY),
            );
            await upsertCredentials([
              {
                credentialId: data.credentialId,
                publicKeyX: data.publicKeyX.toString(),
                publicKeyY: data.publicKeyY.toString(),
                keyHash: data.keyHash,
              },
            ]);
            console.log('[veridex-client] Restored SDK credential from relayer');
            return true;
          }
        }
      } catch (error) {
        console.error('[veridex-client] Failed to restore credential from relayer:', error);
      }
    }

    return false;
  } catch (error) {
    console.error('[veridex-client] Error restoring SDK credential:', error);
    return false;
  }
}

/**
 * Sync the newly created credential to BOTH the dashboard backend AND the relayer
 * This ensures credentials can be recovered from either source
 */
async function syncCredentialToBackend(credential: any): Promise<void> {
  const publicKeyX = credential.publicKeyX.toString();
  const publicKeyY = credential.publicKeyY.toString();
  const keyHash = credential.keyHash;
  const credentialId = credential.credentialId;

  // 0. Mirror to the encrypted local store so subsequent reloads can hydrate
  //    the SDK without any network round-trips.
  try {
    await upsertCredentials([
      { credentialId, publicKeyX, publicKeyY, keyHash },
    ]);
  } catch (e) {
    console.warn('[veridex-client] Failed to mirror credential to secure store:', e);
  }

  // 1. Sync to dashboard's backend (for authenticated session management)
  // Note: This will return 401 if user isn't logged in yet - that's expected
  // The relayer sync below is the primary backup mechanism
  try {
    const response = await fetch('/api/auth/credentials', {
      method: 'POST',
      body: JSON.stringify({
        credentialId,
        publicKeyX,
        publicKeyY,
        keyHash,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      console.log('Credential synced to dashboard backend');
    }
    // 401 is expected if not authenticated - silently continue
  } catch {
    // Network error - silently continue, relayer sync is the primary backup
  }

  // 2. Sync to relayer (for cross-device/pre-auth recovery)
  if (RELAYER_URL) {
    try {
      await fetch(`${RELAYER_URL}/api/v1/credential`, {
        method: 'POST',
        body: JSON.stringify({
          keyHash,
          credentialId,
          publicKeyX,
          publicKeyY,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('Credential synced to relayer');
    } catch (error) {
      console.error('Failed to sync credential to relayer:', error);
    }
  }
}

/**
 * Fetch credentials from the relayer (public endpoint, no auth required)
 * This is called BEFORE authentication to populate localStorage
 */
async function fetchRelayerCredentials(): Promise<void> {
  if (!RELAYER_URL || typeof window === 'undefined') return;

  const existing = await loadCredentialBlob();
  if (existing.credentials.length > 0) return;

  const active = existing.lastActive;
  if (!active?.credentialId) return;

  try {
    const response = await fetch(
      `${RELAYER_URL}/api/v1/credential/by-id/${encodeURIComponent(active.credentialId)}`,
    );
    if (!response.ok) return;
    const data = await response.json();
    if (data.exists && data.publicKeyX && data.publicKeyY && data.keyHash) {
      await upsertCredentials([
        {
          credentialId: data.credentialId,
          publicKeyX: data.publicKeyX.toString(),
          publicKeyY: data.publicKeyY.toString(),
          keyHash: data.keyHash,
        },
      ]);
      console.log('[veridex-client] Credential cached from relayer');
    }
  } catch (error) {
    console.error('[veridex-client] Failed to fetch credential from relayer:', error);
  }
}

/**
 * Fetch credentials from backend and populate SDK storage
 * Falls back gracefully - the SDK will fetch from relayer during authentication if needed
 */
async function fetchBackendCredentials(_sdk: any): Promise<void> {
  // First try to populate from the relayer (public endpoint).
  await fetchRelayerCredentials();

  // Then try the authenticated backend endpoint (no-op if unauthenticated).
  try {
    const response = await fetch('/api/auth/credentials');
    if (!response.ok) return;

    const data = await response.json();
    if (!data.authenticators || !Array.isArray(data.authenticators)) return;

    const validAuths = data.authenticators.filter(
      (auth: any) =>
        auth.credentialID && auth.publicKeyX && auth.publicKeyY && auth.keyHash,
    );
    if (validAuths.length === 0) return;

    const credentials: StoredPasskeyCredential[] = validAuths.map((auth: any) => ({
      credentialId: auth.credentialID,
      publicKeyX: auth.publicKeyX.toString(),
      publicKeyY: auth.publicKeyY.toString(),
      keyHash: auth.keyHash,
    }));

    const blob = await upsertCredentials(credentials);
    console.log(
      `[veridex-client] Synced ${blob.credentials.length} credential(s) from backend`,
    );
  } catch {
    // Network error or other issue — silently continue, SDK will handle.
  }
}

// ============================================================================
// Cross-Origin Passkey Authentication
// ============================================================================

// CrossOriginAuth singleton instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let crossOriginAuthInstance: any = null;

/**
 * Get or create the CrossOriginAuth instance for cross-domain passkey authentication.
 * Uses Related Origin Requests (Chrome 128+, Safari 18+) with Auth Portal fallback.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getCrossOriginAuth(): Promise<any> {
  if (!crossOriginAuthInstance) {
    const { createCrossOriginAuth } = await loadSDKModule();
    crossOriginAuthInstance = createCrossOriginAuth({
      authPortalUrl: process.env.NEXT_PUBLIC_AUTH_PORTAL_URL || 'https://auth.veridex.network',
      mode: 'popup',
      popupFeatures: 'width=420,height=600,scrollbars=yes,resizable=yes',
      timeout: 5 * 60 * 1000, // 5 minutes
    });
  }
  return crossOriginAuthInstance;
}

/**
 * Check if the browser supports WebAuthn Related Origin Requests.
 * This is the preferred method for cross-domain passkey authentication.
 * Available in Chrome 128+, Safari 18+.
 */
export async function supportsRelatedOrigins(): Promise<boolean> {
  const crossOriginAuth = await getCrossOriginAuth();
  return crossOriginAuth.supportsRelatedOrigins();
}

/**
 * Authenticate using cross-origin passkey with Related Origin Requests.
 * This only works if supportsRelatedOrigins() returns true.
 * For browsers without Related Origins support, use connectWithVeridex() instead.
 */
export async function authenticateWithRelatedOrigins(): Promise<{
  address: string;
  hubAddress: string;
  keyHash: string;
  credentialId: string;
}> {
  const crossOriginAuth = await getCrossOriginAuth();

  if (!await crossOriginAuth.supportsRelatedOrigins()) {
    throw new Error('Browser does not support Related Origin Requests. Use connectWithVeridex() instead.');
  }

  const result = await crossOriginAuth.authenticate();

  // Fix: Save credential to SDK instance and local storage
  // This ensures restoreSDKCredential() works on page reload
  const sdk = await getVeridexSDK();
  sdk.passkey.setCredential(result.credential);
  await upsertCredentials([
    {
      credentialId: result.credential.credentialId,
      publicKeyX: result.credential.publicKeyX.toString(),
      publicKeyY: result.credential.publicKeyY.toString(),
      keyHash: result.credential.keyHash,
    },
  ]);
  // Drop the plaintext key the SDK may have written.
  try { localStorage.removeItem('veridex_credentials'); } catch {}

  // Compute the Ethereum Sepolia vault address (for Sera transactions)
  const vaultAddress = await computeEthSepoliaVaultAddress(result.credential.keyHash);

  // Get the Base hub vault address
  const hubAddress = sdk.getVaultAddress();

  return {
    address: vaultAddress,
    hubAddress,
    keyHash: result.credential.keyHash,
    credentialId: result.credential.credentialId,
  };
}

/**
 * Connect with Veridex using the Auth Portal (popup or redirect).
 * This is the fallback method for browsers without Related Origin Requests support.
 * 
 * @param options.mode - 'popup' (default) or 'redirect'
 * @param options.redirectUrl - URL to redirect back to (only for 'redirect' mode)
 */
export async function connectWithVeridex(options?: {
  mode?: 'popup' | 'redirect';
  redirectUrl?: string;
}): Promise<{
  address: string;
  hubAddress: string;
  keyHash: string;
  credentialId: string;
  sessionPublicKey?: string;
  expiresAt?: number;
}> {
  const crossOriginAuth = await getCrossOriginAuth();
  const session = await crossOriginAuth.connectWithVeridex(options);

  // Fix: Save credential to SDK instance and local storage
  // This ensures restoreSDKCredential() works on page reload
  const sdk = await getVeridexSDK();
  sdk.passkey.setCredential(session.credential);
  await upsertCredentials([
    {
      credentialId: session.credential.credentialId,
      publicKeyX: session.credential.publicKeyX.toString(),
      publicKeyY: session.credential.publicKeyY.toString(),
      keyHash: session.credential.keyHash,
    },
  ]);
  try { localStorage.removeItem('veridex_credentials'); } catch {}

  // Compute the Ethereum Sepolia vault address (for Sera transactions)
  const vaultAddress = await computeEthSepoliaVaultAddress(session.credential.keyHash);

  return {
    address: vaultAddress,
    hubAddress: session.address, // This is the hub chain address from CrossOriginSession
    keyHash: session.credential.keyHash,
    credentialId: session.credential.credentialId,
    sessionPublicKey: session.sessionPublicKey,
    expiresAt: session.expiresAt,
  };
}

/**
 * Universal cross-origin authentication that automatically selects the best method.
 * - Uses Related Origin Requests if supported (seamless, no popup)
 * - Falls back to Auth Portal popup if not supported
 */
export async function authenticateCrossOrigin(): Promise<{
  address: string;
  hubAddress: string;
  keyHash: string;
  credentialId: string;
  method: 'related-origins' | 'auth-portal';
}> {
  const crossOriginAuth = await getCrossOriginAuth();

  if (await crossOriginAuth.supportsRelatedOrigins()) {
    const result = await authenticateWithRelatedOrigins();
    return { ...result, method: 'related-origins' };
  } else {
    const result = await connectWithVeridex({ mode: 'popup' });
    return { ...result, method: 'auth-portal' };
  }
}

