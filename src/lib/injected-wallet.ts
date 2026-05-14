'use client';

import { ethers } from 'ethers';

// Supported chains
const SUPPORTED_CHAINS = {
    // Sepolia testnet
    11155111: {
        chainId: '0xaa36a7',
        chainName: 'Sepolia',
        nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://rpc.sepolia.org'],
        blockExplorerUrls: ['https://sepolia.etherscan.io'],
    },
};

export interface WalletSession {
    address: string;
    chainId: number;
    provider: ethers.BrowserProvider;
    walletType: 'injected' | 'walletconnect';
    disconnect: () => Promise<void>;
}

export interface InjectedWalletInfo {
    name: string;
    icon?: string;
    provider: ethers.Eip1193Provider;
}

// Detect installed browser wallets
export function detectInjectedWallets(): InjectedWalletInfo[] {
    if (typeof window === 'undefined') return [];

    const wallets: InjectedWalletInfo[] = [];
    const ethereum = (window as any).ethereum;

    if (!ethereum) return [];

    // Check for multiple injected providers (EIP-6963)
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
        for (const provider of ethereum.providers) {
            if (provider.isMetaMask) {
                wallets.push({ name: 'MetaMask', provider });
            } else if (provider.isCoinbaseWallet) {
                wallets.push({ name: 'Coinbase Wallet', provider });
            } else if (provider.isRabby) {
                wallets.push({ name: 'Rabby', provider });
            } else if (provider.isRainbow) {
                wallets.push({ name: 'Rainbow', provider });
            }
        }
    } else {
        // Single provider
        if (ethereum.isMetaMask) {
            wallets.push({ name: 'MetaMask', provider: ethereum });
        } else if (ethereum.isCoinbaseWallet) {
            wallets.push({ name: 'Coinbase Wallet', provider: ethereum });
        } else if (ethereum.isRabby) {
            wallets.push({ name: 'Rabby', provider: ethereum });
        } else if (ethereum.isRainbow) {
            wallets.push({ name: 'Rainbow', provider: ethereum });
        } else {
            // Generic injected wallet
            wallets.push({ name: 'Browser Wallet', provider: ethereum });
        }
    }

    return wallets;
}

// Check if any injected wallet is available
export function hasInjectedWallet(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(window as any).ethereum;
}

// Get the primary injected provider (MetaMask preferred)
function getInjectedProvider(): ethers.Eip1193Provider | null {
    if (typeof window === 'undefined') return null;

    const ethereum = (window as any).ethereum;
    if (!ethereum) return null;

    // If there are multiple providers, prefer MetaMask
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
        const metamask = ethereum.providers.find((p: any) => p.isMetaMask);
        if (metamask) return metamask;
        return ethereum.providers[0];
    }

    return ethereum;
}

// Connect to injected wallet (MetaMask, etc.)
export async function connectInjectedWallet(): Promise<WalletSession> {
    const provider = getInjectedProvider();

    if (!provider) {
        throw new Error('No wallet detected. Please install MetaMask or another browser wallet.');
    }

    try {
        // Request accounts - this triggers the wallet connection popup
        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts connected');
        }

        const chainId = await provider.request({ method: 'eth_chainId' }) as string;
        const address = accounts[0];
        const numericChainId = parseInt(chainId, 16);

        // Create ethers provider
        const ethersProvider = new ethers.BrowserProvider(provider);

        return {
            address,
            chainId: numericChainId,
            provider: ethersProvider,
            walletType: 'injected',
            disconnect: async () => {
                // Most injected wallets don't have a disconnect method
                // The user disconnects from within the wallet
                console.log('To disconnect, please use your wallet extension');
            },
        };
    } catch (error: any) {
        if (error.code === 4001) {
            throw new Error('Connection request rejected by user');
        }
        throw new Error(error.message || 'Failed to connect wallet');
    }
}

// Sign message with injected wallet
export async function signMessageWithInjectedWallet(message: string): Promise<string> {
    const provider = getInjectedProvider();
    if (!provider) {
        throw new Error('No wallet connected');
    }

    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    return signer.signMessage(message);
}

// Sign EIP-712 typed data with injected wallet
export async function signTypedDataWithInjectedWallet(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    message: Record<string, unknown>,
): Promise<string> {
    const provider = getInjectedProvider();
    if (!provider) {
        throw new Error('No wallet connected');
    }

    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    // ethers v6 strips EIP712Domain from types automatically when signing
    const cleanedTypes = { ...types };
    delete (cleanedTypes as Record<string, unknown>).EIP712Domain;
    return signer.signTypedData(domain, cleanedTypes, message);
}

// Send transaction with injected wallet
export async function sendTransactionWithInjectedWallet(tx: {
    to: string;
    value?: bigint;
    data?: string;
}): Promise<string> {
    const provider = getInjectedProvider();
    if (!provider) {
        throw new Error('No wallet connected');
    }

    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const response = await signer.sendTransaction(tx);
    return response.hash;
}

// Listen for account changes
export function onAccountsChanged(callback: (accounts: string[]) => void): () => void {
    const provider = getInjectedProvider();
    if (!provider) return () => { };

    const handler = (accounts: string[]) => callback(accounts);
    (provider as any).on('accountsChanged', handler);

    return () => {
        (provider as any).removeListener('accountsChanged', handler);
    };
}

// Listen for chain changes
export function onChainChanged(callback: (chainId: number) => void): () => void {
    const provider = getInjectedProvider();
    if (!provider) return () => { };

    const handler = (chainId: string) => callback(parseInt(chainId, 16));
    (provider as any).on('chainChanged', handler);

    return () => {
        (provider as any).removeListener('chainChanged', handler);
    };
}

// Switch to Sepolia network
export async function switchToSepolia(): Promise<void> {
    const provider = getInjectedProvider();
    if (!provider) {
        throw new Error('No wallet connected');
    }

    try {
        await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia
        });
    } catch (error: any) {
        // If the chain is not added, add it
        if (error.code === 4902) {
            await provider.request({
                method: 'wallet_addEthereumChain',
                params: [SUPPORTED_CHAINS[11155111]],
            });
        } else {
            throw error;
        }
    }
}
