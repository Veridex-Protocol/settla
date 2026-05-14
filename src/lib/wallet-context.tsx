'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  isPasskeySupported,
  hasStoredCredentials,
  getStoredCredentialInfo,
  storeCredentialInfo,
  clearStoredCredentialInfo,
  registerPasskey,
  authenticateWithPasskey,
  signWithPasskey,
  getBalance,
  prepareTransfer,
  executeSignedTransfer,
  restoreSDKCredential,
  getTokenBalanceForPayment,
} from './veridex-client';
import {
  connectWalletConnect,
  disconnectWalletConnect,
  signMessageWithWalletConnect,
  signTypedDataWithWalletConnect,
  sendTransactionWithWalletConnect,
  onWalletConnectAccountsChanged,
  onWalletConnectChainChanged,
  onWalletConnectDisconnect,
  isWalletConnectAvailable,
  WalletConnectSession,
} from './walletconnect';
import {
  connectInjectedWallet,
  hasInjectedWallet,
  detectInjectedWallets,
  signMessageWithInjectedWallet,
  signTypedDataWithInjectedWallet,
  onAccountsChanged,
  onChainChanged,
  switchToSepolia,
} from './injected-wallet';
import type { TypedDataDomain, TypedDataField } from 'ethers';

// Wallet connection methods
type ConnectionMethod = 'injected' | 'walletconnect' | 'passkey';

// Passkey connection modes
type PasskeyMode = 'authenticate' | 'register';

interface WalletState {
  address: string | null;
  hubAddress: string | null; // Base Sepolia hub address
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  balance: string | null;
  connectionMethod: ConnectionMethod | null;
  passkeySupported: boolean;
  credentialId: string | null;
  hasStoredPasskey: boolean; // Whether user has a stored passkey
}

interface WebAuthnSignature {
  authenticatorData: string;
  clientDataJSON: string;
  challengeIndex: number;
  typeIndex: number;
  r: bigint;
  s: bigint;
}

interface WalletContextType extends WalletState {
  // Connection methods
  connect: (method: ConnectionMethod) => Promise<void>;
  connectPasskey: (
    mode: PasskeyMode,
    username?: string,
  ) => Promise<{
    address: string;
    credentialId: string;
    registrationToken: string | null;
  }>;
  disconnect: () => void;
  // Switch connection method WITHOUT clearing NextAuth session or stored passkey
  // credential — used when a user wants to pay with a different wallet without
  // logging out of their account.
  switchWallet: (method: ConnectionMethod) => Promise<void>;

  // Passkey-specific methods (deprecated - use connectPasskey instead)
  registerNewPasskey: (username: string, displayName?: string) => Promise<void>;

  // Signing
  signMessage: (message: string) => Promise<string>;
  signTypedData: (
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    message: Record<string, unknown>,
  ) => Promise<string>;

  // Payments (Apple Pay-style one-tap experience)
  preparePayment: (to: string, amount: string, token?: string) => Promise<{
    transferId: string;
  }>;
  confirmPayment: (transferId: string) => Promise<{
    txHash: string;
    status: string;
    sequence?: string;
  }>;

  // Balance refresh
  refreshBalance: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface PendingTransfer {
  challenge: Uint8Array;
  signature?: WebAuthnSignature;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState<WalletState>({
    address: null,
    hubAddress: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    balance: null,
    connectionMethod: null,
    passkeySupported: false,
    credentialId: null,
    hasStoredPasskey: false,
  });

  // Pending transfers for two-step payment flow
  const pendingTransfersRef = useRef<Map<string, PendingTransfer>>(new Map());

  // WalletConnect session and cleanup
  const walletConnectSessionRef = useRef<WalletConnectSession | null>(null);
  const wcUnsubscribersRef = useRef<Array<() => void>>([]);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  // Safe setState that checks if component is mounted
  const safeSetState = useCallback((updater: WalletState | ((prev: WalletState) => WalletState)) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  // Check passkey support and restore session on mount
  useEffect(() => {
    isMountedRef.current = true;
    const supported = isPasskeySupported();
    const hasStored = hasStoredCredentials();
    safeSetState(prev => ({
      ...prev,
      passkeySupported: supported,
      hasStoredPasskey: hasStored,
    }));

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
    };
  }, [safeSetState]);

  // Restore wallet connection from NextAuth session
  useEffect(() => {
    // Only restore if we have a valid NextAuth session
    if (status === 'authenticated' && session?.user?.walletAddress) {
      const walletAddress = session.user.walletAddress;
      const stored = getStoredCredentialInfo();

      // Restore the wallet connection state
      safeSetState(prev => ({
        ...prev,
        address: walletAddress,
        isConnected: true,
        isConnecting: false,
        chainId: 11155111, // Ethereum Sepolia
        connectionMethod: 'passkey',
        credentialId: stored?.credentialId || null,
        hasStoredPasskey: !!stored,
      }));

      // Also restore the SDK credential from localStorage
      // This is crucial for payment operations after page reload
      restoreSDKCredential().then(restored => {
        if (!restored) {
          console.warn('[WalletContext] Could not restore SDK credential - user may need to re-authenticate');
        }
      });
    } else if (status === 'unauthenticated') {
      // Clear wallet state if not authenticated
      safeSetState(prev => ({
        ...prev,
        address: null,
        hubAddress: null,
        isConnected: false,
        isConnecting: false,
        chainId: null,
        balance: null,
        connectionMethod: null,
        credentialId: null,
      }));
    }
  }, [status, session, safeSetState]);

  const refreshBalance = useCallback(async () => {
    if (!state.address) return;

    try {
      const balanceInfo = await getBalance(state.address);
      safeSetState(prev => ({ ...prev, balance: balanceInfo.balance }));
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }, [state.address, safeSetState]);

  // Refresh balance when address changes
  useEffect(() => {
    if (state.address && state.isConnected) {
      refreshBalance();
    }
  }, [state.address, state.isConnected, refreshBalance]);

  const registerNewPasskey = useCallback(async (username: string, displayName?: string) => {
    safeSetState(prev => ({ ...prev, isConnecting: true }));

    try {
      const result = await registerPasskey(username, displayName);

      // Store credential info for future sessions
      storeCredentialInfo({
        address: result.address,
        credentialId: result.credentialId,
      });

      safeSetState({
        address: result.address,
        hubAddress: result.hubAddress,
        isConnected: true,
        isConnecting: false,
        chainId: 11155111, // Ethereum Sepolia (where Sera stablecoins are)
        balance: null,
        connectionMethod: 'passkey',
        passkeySupported: true,
        credentialId: result.credentialId,
        hasStoredPasskey: true,
      });
    } catch (error) {
      console.error('Passkey registration failed:', error);
      safeSetState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [safeSetState]);

  const connect = useCallback(async (method: ConnectionMethod) => {
    safeSetState(prev => ({ ...prev, isConnecting: true }));

    try {
      if (method === 'injected') {
        // Direct connection to browser wallet (MetaMask, etc.)
        if (!hasInjectedWallet()) {
          throw new Error('No wallet detected. Please install MetaMask or another browser wallet.');
        }

        console.log('Connecting to browser wallet...');
        const session = await connectInjectedWallet();

        // Switch to Sepolia network if not already on it
        if (session.chainId !== 11155111) {
          console.log('Switching to Sepolia network...');
          try {
            await switchToSepolia();
          } catch (switchError) {
            console.error('Failed to switch to Sepolia:', switchError);
            // Continue anyway - user might manually switch
          }
        }

        // Set up event listeners for injected wallet
        const unsubAccounts = onAccountsChanged((accounts) => {
          if (accounts.length === 0) {
            disconnect();
          } else {
            safeSetState(prev => ({ ...prev, address: accounts[0] }));
          }
        });

        const unsubChain = onChainChanged((chainId) => {
          safeSetState(prev => ({ ...prev, chainId }));
        });

        // Store unsubscribe functions
        wcUnsubscribersRef.current = [unsubAccounts, unsubChain];

        safeSetState({
          address: session.address,
          hubAddress: null,
          isConnected: true,
          isConnecting: false,
          chainId: session.chainId,
          balance: null,
          connectionMethod: 'injected',
          passkeySupported: isPasskeySupported(),
          credentialId: null,
          hasStoredPasskey: hasStoredCredentials(),
        });

      } else if (method === 'walletconnect') {
        // WalletConnect v2 integration (for mobile wallets)
        const wcAvailable = await isWalletConnectAvailable();
        if (!wcAvailable) {
          throw new Error('WalletConnect packages not installed. Run: bun add @walletconnect/ethereum-provider');
        }

        console.log('Connecting via WalletConnect...');
        const session: WalletConnectSession = await connectWalletConnect();

        // Store WalletConnect session reference
        walletConnectSessionRef.current = session;

        // Set up event listeners
        const unsubAccounts = onWalletConnectAccountsChanged((accounts) => {
          if (accounts.length === 0) {
            disconnect();
          } else {
            safeSetState(prev => ({ ...prev, address: accounts[0] }));
          }
        });

        const unsubChain = onWalletConnectChainChanged((chainId) => {
          safeSetState(prev => ({ ...prev, chainId }));
        });

        const unsubDisconnect = onWalletConnectDisconnect(() => {
          disconnect();
        });

        // Store unsubscribe functions
        wcUnsubscribersRef.current = [unsubAccounts, unsubChain, unsubDisconnect];

        safeSetState({
          address: session.address,
          hubAddress: null, // WalletConnect doesn't use hub
          isConnected: true,
          isConnecting: false,
          chainId: session.chainId,
          balance: null,
          connectionMethod: 'walletconnect',
          passkeySupported: isPasskeySupported(),
          credentialId: null,
          hasStoredPasskey: hasStoredCredentials(),
        });

      } else if (method === 'passkey') {
        // Authenticate with existing passkey
        const result = await authenticateWithPasskey();

        // Update stored info
        storeCredentialInfo({
          address: result.address,
          credentialId: result.credentialId,
        });

        safeSetState({
          address: result.address,
          hubAddress: result.hubAddress,
          isConnected: true,
          isConnecting: false,
          chainId: 11155111, // Ethereum Sepolia (where Sera stablecoins are)
          balance: null,
          connectionMethod: 'passkey',
          passkeySupported: true,
          credentialId: result.credentialId,
          hasStoredPasskey: true,
        });
      }
    } catch (error) {
      console.error('Connection failed:', error);
      safeSetState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [safeSetState]);

  /**
   * Connect with passkey - handles both registration and authentication
   * @param mode - 'authenticate' for existing passkey, 'register' for new passkey
   * @param username - Required for 'register' mode, optional for 'authenticate'
   */
  const connectPasskey = useCallback(async (mode: PasskeyMode, username?: string) => {
    safeSetState(prev => ({ ...prev, isConnecting: true }));

    try {
      if (mode === 'register') {
        if (!username) {
          throw new Error('Username is required for passkey registration');
        }
        const result = await registerPasskey(username, username);

        storeCredentialInfo({
          address: result.address,
          credentialId: result.credentialId,
        });

        safeSetState({
          address: result.address,
          hubAddress: result.hubAddress,
          isConnected: true,
          isConnecting: false,
          chainId: 11155111, // Ethereum Sepolia
          balance: null,
          connectionMethod: 'passkey',
          passkeySupported: true,
          credentialId: result.credentialId,
          hasStoredPasskey: true,
        });

        return {
          address: result.address,
          credentialId: result.credentialId,
          registrationToken: result.registrationToken,
        };
      } else {
        // Authenticate with existing passkey
        const result = await authenticateWithPasskey();

        storeCredentialInfo({
          address: result.address,
          credentialId: result.credentialId,
        });

        safeSetState({
          address: result.address,
          hubAddress: result.hubAddress,
          isConnected: true,
          isConnecting: false,
          chainId: 11155111, // Ethereum Sepolia
          balance: null,
          connectionMethod: 'passkey',
          passkeySupported: true,
          credentialId: result.credentialId,
          hasStoredPasskey: true,
        });

        return {
          address: result.address,
          credentialId: result.credentialId,
          registrationToken: null,
        };
      }
    } catch (error) {
      console.error('Passkey connection failed:', error);
      safeSetState(prev => ({ ...prev, isConnecting: false }));
      throw error;
    }
  }, [safeSetState]);

  const disconnect = useCallback(async () => {
    // Clean up WalletConnect
    if (walletConnectSessionRef.current) {
      await disconnectWalletConnect();
      walletConnectSessionRef.current = null;
    }

    // Clean up WalletConnect event listeners
    wcUnsubscribersRef.current.forEach(unsub => unsub());
    wcUnsubscribersRef.current = [];

    // Clear the active-session pointer ONLY. The encrypted credential blob
    // stays on disk so the user can log back in without re-registering.
    // Use forgetThisDevice() if a hard wipe is needed.
    clearStoredCredentialInfo();

    // Sign out from NextAuth session
    await signOut({ redirect: false });

    safeSetState({
      address: null,
      hubAddress: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      balance: null,
      connectionMethod: null,
      passkeySupported: isPasskeySupported(),
      credentialId: null,
      // Credentials persist across logout — keep this true so the next login
      // can offer "Sign in with existing passkey".
      hasStoredPasskey: hasStoredCredentials(),
    });
  }, [safeSetState]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!state.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (state.connectionMethod === 'passkey') {
      // Convert message to Uint8Array
      const encoder = new TextEncoder();
      const challenge = encoder.encode(message);
      const result = await signWithPasskey(challenge);
      // Return r.s concatenated as hex signature
      return `0x${result.r.toString(16).padStart(64, '0')}${result.s.toString(16).padStart(64, '0')}`;
    }

    if (state.connectionMethod === 'walletconnect') {
      // Sign with WalletConnect
      return signMessageWithWalletConnect(message);
    }

    throw new Error('Signing not supported for this connection method');
  }, [state.isConnected, state.connectionMethod]);

  const signTypedData = useCallback(async (
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    message: Record<string, unknown>,
  ): Promise<string> => {
    if (!state.isConnected) {
      throw new Error('Wallet not connected');
    }

    if (state.connectionMethod === 'injected') {
      return signTypedDataWithInjectedWallet(domain, types, message);
    }

    if (state.connectionMethod === 'walletconnect') {
      return signTypedDataWithWalletConnect(domain, types, message);
    }

    if (state.connectionMethod === 'passkey') {
      // Passkey credentials produce WebAuthn (P-256) signatures and cannot be
      // recovered to an EOA address — Sera Intent / EIP-2612 permits both need
      // an EIP-712 EOA signature. Surface a clear error so the UI can prompt
      // the user to switch wallets without logging them out.
      throw new Error(
        'Passkey wallets do not support EIP-712 typed-data signing. ' +
          'Switch to an injected or WalletConnect wallet to use this feature.',
      );
    }

    throw new Error('Typed-data signing not supported for this connection method');
  }, [state.isConnected, state.connectionMethod]);

  // Switch the active wallet without clearing the NextAuth session or the
  // stored passkey credential. Used when a passkey-authenticated user wants to
  // pay a link with a different wallet for this transaction only.
  const switchWallet = useCallback(async (method: ConnectionMethod) => {
    // Tear down active WalletConnect provider/listeners (if any). Leave the
    // stored credential blob and NextAuth session untouched.
    if (walletConnectSessionRef.current) {
      try {
        await disconnectWalletConnect();
      } catch (e) {
        console.warn('[switchWallet] disconnectWalletConnect failed', e);
      }
      walletConnectSessionRef.current = null;
    }
    wcUnsubscribersRef.current.forEach(unsub => unsub());
    wcUnsubscribersRef.current = [];

    // Reset in-memory wallet state but preserve passkey discoverability so the
    // user can switch back without re-registering.
    safeSetState(prev => ({
      ...prev,
      address: null,
      hubAddress: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      balance: null,
      connectionMethod: null,
    }));

    await connect(method);
  }, [safeSetState, connect]);

  const preparePayment = useCallback(async (
    to: string,
    amount: string,
    token?: string
  ): Promise<{ transferId: string }> => {
    console.log('[WalletContext] preparePayment called', {
      to,
      amount,
      token,
      isConnected: state.isConnected,
      connectionMethod: state.connectionMethod,
    });

    if (!state.isConnected) {
      throw new Error('Wallet not connected');
    }

    // For injected wallets (MetaMask), we create a transferId and handle in confirmPayment
    if (state.connectionMethod === 'injected') {
      const transferId = `inj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log('[WalletContext] Created injected wallet transferId:', transferId);
      // Store the payment details for later execution
      pendingTransfersRef.current.set(transferId, {
        challenge: new TextEncoder().encode(JSON.stringify({ to, amount, token })),
        // No signature yet - injected wallet signs during confirmPayment
      });
      return { transferId };
    }

    // For WalletConnect, we create a transferId but handle differently in confirmPayment
    if (state.connectionMethod === 'walletconnect') {
      const transferId = `wc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log('[WalletContext] Created WalletConnect transferId:', transferId);
      // Store the payment details for later execution
      pendingTransfersRef.current.set(transferId, {
        challenge: new TextEncoder().encode(JSON.stringify({ to, amount, token })),
        // No signature yet - WalletConnect signs during confirmPayment
      });
      return { transferId };
    }

    console.log('[WalletContext] Using passkey flow for preparePayment');

    // Ensure the SDK credential is restored before attempting the transfer
    // This handles the case where user clicks "Pay" before async restoration completes
    const credentialRestored = await restoreSDKCredential();
    if (!credentialRestored) {
      throw new Error('No credential set. Call passkey.register() or passkey.setCredential() first.');
    }

    // Check if vault has sufficient balance before proceeding
    // This prevents the confusing scenario where Hub tx succeeds but vault execution fails
    const tokenSymbol = token || 'USDT'; // Default to USDT if no token specified
    try {
      const balanceInfo = await getTokenBalanceForPayment(tokenSymbol);
      console.log('[WalletContext] Vault balance check:', {
        token: tokenSymbol,
        balance: balanceInfo.formatted,
        required: amount,
      });

      if (!balanceInfo.hasSufficientBalance(amount)) {
        throw new Error(
          `Insufficient ${tokenSymbol} balance. Your vault has ${balanceInfo.formatted} ${tokenSymbol}, ` +
          `but ${amount} ${tokenSymbol} is required. Please fund your vault first.`
        );
      }
    } catch (balanceError) {
      // If balance check fails with an insufficient balance error, re-throw it
      if (balanceError instanceof Error && balanceError.message.includes('Insufficient')) {
        throw balanceError;
      }
      // For other errors (network issues, etc.), log and continue
      // The transfer will fail later with a more accurate error
      console.warn('[WalletContext] Balance check failed, proceeding anyway:', balanceError);
    }

    // Passkey flow - prepare and sign immediately
    const prepared = await prepareTransfer({ to, amount, token });

    // Sign the prepared transfer immediately (Apple Pay style - one tap)
    if (state.connectionMethod === 'passkey') {
      const signature = await signWithPasskey(prepared.challenge);
      pendingTransfersRef.current.set(prepared.transferId, {
        challenge: prepared.challenge,
        signature
      });
    }

    return {
      transferId: prepared.transferId,
    };
  }, [state.isConnected, state.connectionMethod]);

  const confirmPayment = useCallback(async (
    transferId: string
  ): Promise<{ txHash: string; status: string; sequence?: string }> => {
    console.log('[WalletContext] confirmPayment called', {
      transferId,
      isConnected: state.isConnected,
      connectionMethod: state.connectionMethod,
    });

    if (!state.isConnected) {
      throw new Error('Wallet not connected');
    }

    // Handle injected wallet payments (MetaMask, etc.)
    if (state.connectionMethod === 'injected' && transferId.startsWith('inj_')) {
      console.log('[WalletContext] Processing injected wallet payment');
      const pending = pendingTransfersRef.current.get(transferId);
      if (!pending) {
        throw new Error('Transfer not prepared');
      }

      // Decode the stored payment details
      const paymentData = JSON.parse(new TextDecoder().decode(pending.challenge));
      console.log('[WalletContext] Payment data:', paymentData);

      // Import token registry and get the correct token address
      const { getTokenBySymbol, DEFAULT_PAYMENT_TOKEN } = await import('./tokens');

      // Get token address from symbol or use the provided address or default to USDT
      let tokenAddress: string;
      if (paymentData.token) {
        // Check if it's a symbol (like "USDC") or an address
        if (paymentData.token.startsWith('0x')) {
          tokenAddress = paymentData.token;
        } else {
          const tokenInfo = getTokenBySymbol(paymentData.token);
          tokenAddress = tokenInfo?.address || DEFAULT_PAYMENT_TOKEN.address;
        }
      } else {
        tokenAddress = DEFAULT_PAYMENT_TOKEN.address;
      }

      console.log('[WalletContext] Token address:', tokenAddress);

      // Get decimals from token info (default to 6 for Sera tokens)
      const tokenInfo = getTokenBySymbol(paymentData.token) || DEFAULT_PAYMENT_TOKEN;
      const decimals = tokenInfo.decimals;

      // Convert amount to smallest unit based on token decimals
      const amountWei = BigInt(Math.floor(parseFloat(paymentData.amount) * Math.pow(10, decimals)));

      // ERC20 transfer function selector + encoded params
      const transferSelector = '0xa9059cbb'; // transfer(address,uint256)
      const encodedTo = paymentData.to.toLowerCase().replace('0x', '').padStart(64, '0');
      const encodedAmount = amountWei.toString(16).padStart(64, '0');
      const data = `${transferSelector}${encodedTo}${encodedAmount}`;

      console.log('[WalletContext] Sending transaction:', {
        to: tokenAddress,
        data,
        amountWei: amountWei.toString(),
        decimals,
      });

      // Import the sendTransactionWithInjectedWallet function
      const { sendTransactionWithInjectedWallet } = await import('./injected-wallet');

      // Send transaction via injected wallet (MetaMask)
      console.log('[WalletContext] Calling sendTransactionWithInjectedWallet...');
      const txHash = await sendTransactionWithInjectedWallet({
        to: tokenAddress,
        data,
      });

      console.log('[WalletContext] Transaction sent, hash:', txHash);

      // Clean up
      pendingTransfersRef.current.delete(transferId);
      refreshBalance();

      return { txHash, status: 'confirmed' };
    }

    // Handle WalletConnect payments
    if (state.connectionMethod === 'walletconnect' && transferId.startsWith('wc_')) {
      const pending = pendingTransfersRef.current.get(transferId);
      if (!pending) {
        throw new Error('Transfer not prepared');
      }

      // Decode the stored payment details
      const paymentData = JSON.parse(new TextDecoder().decode(pending.challenge));

      // Import token registry and get the correct token address
      const { getTokenBySymbol, DEFAULT_PAYMENT_TOKEN } = await import('./tokens');

      // Get token address from symbol or use the provided address or default to USDT
      let tokenAddress: string;
      if (paymentData.token) {
        // Check if it's a symbol (like "USDC") or an address
        if (paymentData.token.startsWith('0x')) {
          tokenAddress = paymentData.token;
        } else {
          const tokenInfo = getTokenBySymbol(paymentData.token);
          tokenAddress = tokenInfo?.address || DEFAULT_PAYMENT_TOKEN.address;
        }
      } else {
        tokenAddress = DEFAULT_PAYMENT_TOKEN.address;
      }

      // Get decimals from token info (default to 6 for Sera tokens)
      const tokenInfo = getTokenBySymbol(paymentData.token) || DEFAULT_PAYMENT_TOKEN;
      const decimals = tokenInfo.decimals;

      // Convert amount to smallest unit based on token decimals
      const amountWei = BigInt(Math.floor(parseFloat(paymentData.amount) * Math.pow(10, decimals)));

      // ERC20 transfer function selector + encoded params
      const transferSelector = '0xa9059cbb'; // transfer(address,uint256)
      const encodedTo = paymentData.to.toLowerCase().replace('0x', '').padStart(64, '0');
      const encodedAmount = amountWei.toString(16).padStart(64, '0');
      const data = `${transferSelector}${encodedTo}${encodedAmount}`;

      // Send transaction via WalletConnect
      const txHash = await sendTransactionWithWalletConnect({
        to: tokenAddress,
        data,
      });

      // Clean up
      pendingTransfersRef.current.delete(transferId);
      refreshBalance();

      return { txHash, status: 'confirmed' };
    }

    // Passkey flow
    const pending = pendingTransfersRef.current.get(transferId);
    if (!pending?.signature) {
      throw new Error('Transfer not prepared or already executed');
    }

    const result = await executeSignedTransfer(transferId, pending.signature);

    // Clean up
    pendingTransfersRef.current.delete(transferId);

    // Refresh balance after transfer
    refreshBalance();

    return {
      txHash: result.txHash,
      status: result.status,
      sequence: result.sequence, // Include sequence for completion polling
    };
  }, [state.isConnected, refreshBalance]);

  return (
    <WalletContext.Provider value={{
      ...state,
      connect,
      connectPasskey,
      disconnect,
      switchWallet,
      registerNewPasskey,
      signMessage,
      signTypedData,
      preparePayment,
      confirmPayment,
      refreshBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
