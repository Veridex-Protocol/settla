import { NextResponse } from "next/server";
import { SERA_TOKENS, TokenInfo, PRIMARY_TOKENS, SERA_CHAIN } from "@/lib/tokens";

// Get ALL Sera tokens to check for balances
const TOKENS_TO_CHECK: TokenInfo[] = Object.values(SERA_TOKENS);

// Primary tokens that should always be shown even with zero balance
const ALWAYS_SHOW_TOKENS = ['USDT', 'USDC', 'EURC', 'GBPA', 'XSGD', 'GYEN', 'AUDD', 'CADC', 'BRLA', 'CCHF', 'KRW1', 'IDRX', 'MXNB'];

// Fallback RPC URLs for Sepolia (uses env variable first, then public fallbacks)
const ALCHEMY_SEPOLIA_RPC = process.env.ETHEREUM_SEPOLIA_RPC_URL || process.env.ALCHEMY_SEPOLIA_RPC_URL;
const FALLBACK_RPC_URLS = [
    ...(ALCHEMY_SEPOLIA_RPC ? [ALCHEMY_SEPOLIA_RPC] : []),
    'https://rpc.sepolia.org',
    'https://eth-sepolia.public.blastapi.io',
];

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 5000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Helper to try multiple RPC endpoints
async function fetchFromRpc(
    primaryRpc: string,
    body: object,
    fallbackRpcs: string[] = FALLBACK_RPC_URLS
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
    const rpcsToTry = [primaryRpc, ...fallbackRpcs];

    for (const rpcUrl of rpcsToTry) {
        try {
            const response = await fetchWithTimeout(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            }, 5000);

            if (response.ok) {
                const data = await response.json();
                if (!data.error) {
                    return { ok: true, data };
                }
            }
        } catch (error) {
            // Try next RPC
            continue;
        }
    }

    return { ok: false, error: 'All RPC endpoints failed' };
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const walletAddress = searchParams.get('address');

        if (!walletAddress) {
            return NextResponse.json({ error: 'Wallet address required' }, { status: 400 });
        }

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
        }

        const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || SERA_CHAIN.rpcUrl;

        const tokenBalances = [];

        // Fetch ETH balance first
        try {
            const result = await fetchFromRpc(rpcUrl, {
                jsonrpc: '2.0',
                method: 'eth_getBalance',
                params: [walletAddress, 'latest'],
                id: 1,
            });

            if (result.ok && result.data) {
                const ethData = result.data as { result?: string };
                if (ethData.result) {
                    const ethBalance = BigInt(ethData.result);
                    const ethFormatted = Number(ethBalance) / 1e18;

                    tokenBalances.push({
                        symbol: 'ETH',
                        name: 'Ethereum',
                        address: 'native',
                        decimals: 18,
                        balance: ethFormatted.toFixed(6),
                        balanceUsd: ethFormatted * 2500, // Approximate ETH price
                        currency: 'ETH',
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch ETH balance:', error);
            // Continue with token balances even if ETH fails
        }

        // Fetch ERC20 token balances using batch requests for efficiency
        const batchPromises = TOKENS_TO_CHECK.map(async (token) => {
            try {
                // Encode balanceOf call
                const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`;

                const result = await fetchFromRpc(rpcUrl, {
                    jsonrpc: '2.0',
                    method: 'eth_call',
                    params: [
                        { to: token.address, data },
                        'latest',
                    ],
                    id: 1,
                });

                if (!result.ok) {
                    return null;
                }

                const rpcResult = result.data as { result?: string; error?: unknown };

                if (rpcResult.error) {
                    return null;
                }

                const balance = BigInt(rpcResult.result || '0');
                const formatted = Number(balance) / Math.pow(10, token.decimals);

                // Only include tokens with non-zero balances or commonly used ones
                if (formatted > 0 || ALWAYS_SHOW_TOKENS.includes(token.symbol)) {
                    return {
                        symbol: token.symbol,
                        name: token.name,
                        address: token.address,
                        decimals: token.decimals,
                        currency: token.currency,
                        balance: formatted.toFixed(2),
                        balanceUsd: formatted, // Stablecoins = 1:1
                    };
                }

                return null;
            } catch (error) {
                // Silently fail for individual tokens
                return null;
            }
        });

        const batchResults = await Promise.all(batchPromises);
        const validTokens = batchResults.filter(Boolean);
        tokenBalances.push(...validTokens);

        // Calculate total USD value
        const totalUsd = tokenBalances.reduce((sum, t) => sum + (t?.balanceUsd || 0), 0);

        return NextResponse.json({
            address: walletAddress,
            network: SERA_CHAIN.name,
            chainId: SERA_CHAIN.chainId,
            tokens: tokenBalances,
            totalUsd: totalUsd.toFixed(2),
        });
    } catch (error) {
        console.error("[WALLET_TOKENS_GET]", error);
        return NextResponse.json({
            error: "Failed to fetch token balances",
            address: null,
            tokens: [],
            totalUsd: "0.00"
        }, { status: 500 });
    }
}
