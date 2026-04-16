'use client';

import React from 'react';
import { 
  useSettlement, 
  getSettlementStatusLabel, 
  getSettlementStatusColor 
} from '@/lib/use-settlement';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Badge,
  Button,
  Separator,
} from '@/components/ui';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Coins,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SettlementMonitorProps {
  className?: string;
  maxItems?: number;
}

export function SettlementMonitor({ className, maxItems = 10 }: SettlementMonitorProps) {
  const { 
    settlements, 
    isSettling, 
    claimSettlement, 
    refreshSettlements 
  } = useSettlement();

  const displaySettlements = settlements.slice(0, maxItems);

  const handleClaim = async (settlementId: string) => {
    try {
      await claimSettlement(settlementId);
    } catch (error) {
      console.error('Failed to claim:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Sera Settlements
          </CardTitle>
          <CardDescription>
            Track stablecoin settlement status
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshSettlements}
          disabled={isSettling}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSettling ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {displaySettlements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No settlements yet</p>
            <p className="text-sm mt-1">Settlements will appear here after payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {displaySettlements.map((settlement) => (
              <SettlementItem
                key={settlement.id}
                settlement={settlement}
                onClaim={handleClaim}
                isClaimLoading={isSettling}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface SettlementItemProps {
  settlement: {
    id: string;
    paymentTxHash: string;
    paymentAmount: string;
    paymentToken: string;
    settlementToken: string;
    status: string;
    claimTxHash?: string;
    settledAmount?: string;
    createdAt: Date;
    error?: string;
  };
  onClaim: (id: string) => void;
  isClaimLoading: boolean;
}

function SettlementItem({ settlement, onClaim, isClaimLoading }: SettlementItemProps) {
  const statusColor = getSettlementStatusColor(settlement.status as any);
  const statusLabel = getSettlementStatusLabel(settlement.status as any);
  const canClaim = settlement.status === 'filled' || settlement.status === 'partially_filled';

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon status={settlement.status} />
          <Badge className={statusColor}>
            {statusLabel}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(settlement.createdAt), { addSuffix: true })}
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-lg font-semibold mb-2">
        <span>{settlement.paymentAmount} {settlement.paymentToken}</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span>{settlement.settlementToken}</span>
      </div>

      <div className="space-y-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Payment:</span>
          <a 
            href={`https://sepolia.etherscan.io/tx/${settlement.paymentTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono hover:text-primary flex items-center gap-1"
          >
            {settlement.paymentTxHash.slice(0, 10)}...
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        
        {settlement.claimTxHash && (
          <div className="flex items-center gap-2">
            <span>Claim:</span>
            <a 
              href={`https://sepolia.etherscan.io/tx/${settlement.claimTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono hover:text-primary flex items-center gap-1"
            >
              {settlement.claimTxHash.slice(0, 10)}...
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {settlement.error && (
        <div className="mt-3 p-2 rounded bg-red-50 text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          {settlement.error}
        </div>
      )}

      {canClaim && (
        <div className="mt-3">
          <Button 
            size="sm" 
            onClick={() => onClaim(settlement.id)}
            disabled={isClaimLoading}
            className="w-full"
          >
            {isClaimLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Claim Proceeds
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'settled':
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    case 'failed':
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    case 'filled':
    case 'partially_filled':
      return <Coins className="h-5 w-5 text-green-600" />;
    default:
      return <Clock className="h-5 w-5 text-blue-600" />;
  }
}
