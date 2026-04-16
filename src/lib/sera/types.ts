/**
 * Sera Exchange Types
 * Copied from @veridex/sera to avoid workspace dependency conflicts
 */

export interface SeraToken {
  symbol: string;
  decimals: number;
}

export interface SeraMarket {
  id: string; // OrderBook address
  quoteToken: SeraToken;
  baseToken: SeraToken;
  minPrice: string; // decimal string
  tickSpace: string; // decimal string
  quoteUnit: string; // decimal string
  latestPrice?: string | null;
  latestPriceIndex?: string | null;
}

export type SeraOpenOrderStatus = 'open' | 'partial' | 'filled' | 'claimed' | 'cancelled';

export interface SeraOpenOrder {
  id: string;
  nftId?: string | null;
  user: string;
  market: string;
  isBid: boolean;
  priceIndex: string;
  rawAmount: string;
  rawFilledAmount?: string | null;
  claimableAmount?: string | null;
  status: SeraOpenOrderStatus | string;
  createdAt?: string | null;
}

export interface SeraDepth {
  priceIndex: string;
  price?: string | null;
  isBid: boolean;
  rawAmount: string;
}
