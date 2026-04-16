'use client';

import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { 
  settlementService, 
  SettlementRecord, 
  SettlementStatus,
  SettlementParams 
} from './settlement-service';
import { SERA_CONFIG } from './sera-client';

interface UseSettlementOptions {
  autoSettleEnabled?: boolean;
  settlementToken?: string; // Default token to settle to
}

interface UseSettlementReturn {
  // State
  settlements: SettlementRecord[];
  isSettling: boolean;
  error: string | null;
  
  // Actions
  initiateSettlement: (params: Omit<SettlementParams, 'settlementToken'> & { settlementToken?: string }) => Promise<SettlementRecord>;
  claimSettlement: (settlementId: string) => Promise<SettlementRecord>;
  getSettlement: (settlementId: string) => SettlementRecord | undefined;
  refreshSettlements: () => void;
}

/**
 * Hook for managing Sera settlement in the payment flow
 */
export function useSettlement(options: UseSettlementOptions = {}): UseSettlementReturn {
  const { 
    autoSettleEnabled = true, 
    settlementToken = 'USDC' // Default: keep in same token (no conversion)
  } = options;

  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh settlements list
  const refreshSettlements = useCallback(() => {
    setSettlements(settlementService.listSettlements());
  }, []);

  // Poll for updates
  useEffect(() => {
    refreshSettlements();
    const interval = setInterval(refreshSettlements, 5000);
    return () => clearInterval(interval);
  }, [refreshSettlements]);

  // Get a signer for settlement transactions
  const getSigner = useCallback(async (): Promise<ethers.Signer> => {
    // In a real implementation, this would use the merchant's settlement wallet
    // For demo, we create a signer from environment variable
    const privateKey = process.env.NEXT_PUBLIC_SETTLEMENT_WALLET_KEY;
    
    if (!privateKey) {
      throw new Error('Settlement wallet not configured');
    }

    const provider = new ethers.JsonRpcProvider(SERA_CONFIG.rpcUrl);
    return new ethers.Wallet(privateKey, provider);
  }, []);

  // Initiate a new settlement
  const initiateSettlement = useCallback(async (
    params: Omit<SettlementParams, 'settlementToken'> & { settlementToken?: string }
  ): Promise<SettlementRecord> => {
    setIsSettling(true);
    setError(null);

    try {
      const signer = await getSigner();
      
      const record = await settlementService.initiateSettlement(signer, {
        ...params,
        settlementToken: params.settlementToken || settlementToken,
      });

      refreshSettlements();
      return record;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Settlement failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSettling(false);
    }
  }, [getSigner, settlementToken, refreshSettlements]);

  // Claim proceeds from a filled settlement
  const claimSettlement = useCallback(async (settlementId: string): Promise<SettlementRecord> => {
    setIsSettling(true);
    setError(null);

    try {
      const signer = await getSigner();
      const record = await settlementService.claimSettlement(signer, settlementId);
      refreshSettlements();
      return record;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Claim failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSettling(false);
    }
  }, [getSigner, refreshSettlements]);

  // Get a specific settlement
  const getSettlement = useCallback((settlementId: string): SettlementRecord | undefined => {
    return settlementService.getSettlement(settlementId);
  }, []);

  return {
    settlements,
    isSettling,
    error,
    initiateSettlement,
    claimSettlement,
    getSettlement,
    refreshSettlements,
  };
}

/**
 * Helper function to get human-readable status
 */
export function getSettlementStatusLabel(status: SettlementStatus): string {
  const labels: Record<SettlementStatus, string> = {
    pending: 'Pending',
    placing_order: 'Placing Order',
    order_placed: 'Order Placed',
    partially_filled: 'Partially Filled',
    filled: 'Filled',
    claiming: 'Claiming',
    settled: 'Settled',
    failed: 'Failed',
  };
  return labels[status];
}

/**
 * Helper function to get status color for UI
 */
export function getSettlementStatusColor(status: SettlementStatus): string {
  const colors: Record<SettlementStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    placing_order: 'bg-blue-100 text-blue-800',
    order_placed: 'bg-blue-100 text-blue-800',
    partially_filled: 'bg-orange-100 text-orange-800',
    filled: 'bg-green-100 text-green-800',
    claiming: 'bg-purple-100 text-purple-800',
    settled: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
  };
  return colors[status];
}
