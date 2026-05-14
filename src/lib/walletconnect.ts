'use client';

import { ethers } from 'ethers';

// WalletConnect configuration
const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

// Check if WalletConnect is properly configured
const isWalletConnectConfigured = () => {
  return WALLETCONNECT_PROJECT_ID && WALLETCONNECT_PROJECT_ID !== 'your-project-id';
};

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

export interface WalletConnectSession {
  address: string;
  chainId: number;
  provider: ethers.BrowserProvider;
  disconnect: () => Promise<void>;
}

// Type for the WalletConnect provider
type WCEthereumProvider = Awaited<ReturnType<typeof import('@walletconnect/ethereum-provider').EthereumProvider.init>>;

// Dynamic import for WalletConnect to avoid SSR issues
let walletConnectProvider: WCEthereumProvider | null = null;

export async function initWalletConnect(): Promise<WCEthereumProvider> {
  if (walletConnectProvider) {
    return walletConnectProvider;
  }

  if (!isWalletConnectConfigured()) {
    console.warn('WalletConnect Project ID not configured. Get one at https://cloud.walletconnect.com/');
    throw new Error('WalletConnect not configured. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env file.');
  }

  try {
    // Dynamically import WalletConnect modules
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');

    walletConnectProvider = await EthereumProvider.init({
      projectId: WALLETCONNECT_PROJECT_ID,
      chains: [11155111], // Sepolia
      showQrModal: true,
      metadata: {
        name: 'Sera Dashboard',
        description: 'Veridex Merchant Payment Dashboard',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://sera.veridex.io',
        icons: ['https://veridex.io/icon.png'],
      },
      optionalChains: [1, 11155111], // Mainnet + Sepolia
    });

    return walletConnectProvider;
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error);
    throw new Error('WalletConnect not available. Make sure the packages are installed.');
  }
}

export async function connectWalletConnect(): Promise<WalletConnectSession> {
  const provider = await initWalletConnect();

  // Check if already connected
  if (!provider.connected) {
    // Connect and show QR modal - this must be called first!
    await provider.connect();
  }

  // Now we can make requests
  const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
  const chainId = await provider.request({ method: 'eth_chainId' }) as string;

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts connected');
  }

  const address = accounts[0];
  const numericChainId = parseInt(chainId, 16);

  // Create ethers provider
  const ethersProvider = new ethers.BrowserProvider(provider as unknown as ethers.Eip1193Provider);

  return {
    address,
    chainId: numericChainId,
    provider: ethersProvider,
    disconnect: async () => {
      await provider.disconnect();
      walletConnectProvider = null;
    },
  };
}

export async function disconnectWalletConnect(): Promise<void> {
  if (walletConnectProvider) {
    await walletConnectProvider.disconnect();
    walletConnectProvider = null;
  }
}

export async function getWalletConnectSigner(): Promise<ethers.Signer | null> {
  if (!walletConnectProvider) {
    return null;
  }

  const ethersProvider = new ethers.BrowserProvider(walletConnectProvider as unknown as ethers.Eip1193Provider);
  return ethersProvider.getSigner();
}

export async function signMessageWithWalletConnect(message: string): Promise<string> {
  const signer = await getWalletConnectSigner();
  if (!signer) {
    throw new Error('WalletConnect not connected');
  }
  return signer.signMessage(message);
}

export async function signTypedDataWithWalletConnect(
  domain: ethers.TypedDataDomain,
  types: Record<string, ethers.TypedDataField[]>,
  message: Record<string, unknown>,
): Promise<string> {
  const signer = await getWalletConnectSigner();
  if (!signer) {
    throw new Error('WalletConnect not connected');
  }
  const cleanedTypes = { ...types };
  delete (cleanedTypes as Record<string, unknown>).EIP712Domain;
  return signer.signTypedData(domain, cleanedTypes, message);
}

export async function sendTransactionWithWalletConnect(tx: {
  to: string;
  value?: bigint;
  data?: string;
}): Promise<string> {
  const signer = await getWalletConnectSigner();
  if (!signer) {
    throw new Error('WalletConnect not connected');
  }

  const response = await signer.sendTransaction(tx);
  return response.hash;
}

// Event listeners
export function onWalletConnectAccountsChanged(callback: (accounts: string[]) => void): () => void {
  if (!walletConnectProvider) return () => { };

  const handler = (accounts: string[]) => callback(accounts);
  walletConnectProvider.on('accountsChanged', handler);

  return () => {
    walletConnectProvider?.removeListener('accountsChanged', handler);
  };
}

export function onWalletConnectChainChanged(callback: (chainId: number) => void): () => void {
  if (!walletConnectProvider) return () => { };

  const handler = (chainId: string) => callback(parseInt(chainId, 16));
  walletConnectProvider.on('chainChanged', handler);

  return () => {
    walletConnectProvider?.removeListener('chainChanged', handler);
  };
}

export function onWalletConnectDisconnect(callback: () => void): () => void {
  if (!walletConnectProvider) return () => { };

  walletConnectProvider.on('disconnect', callback);

  return () => {
    walletConnectProvider?.removeListener('disconnect', callback);
  };
}

// Check if WalletConnect packages are available
export async function isWalletConnectAvailable(): Promise<boolean> {
  try {
    await import('@walletconnect/ethereum-provider');
    return true;
  } catch {
    return false;
  }
}
