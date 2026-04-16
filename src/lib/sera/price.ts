/**
 * Sera Price Utilities
 * Copied from @veridex/sera to avoid workspace dependency conflicts
 */

import { ethers } from 'ethers';

export interface SeraMarketPricingParams {
  minPrice: bigint;
  tickSpace: bigint;
  quoteUnit: bigint;
}

export function priceIndexToPrice(params: SeraMarketPricingParams, priceIndex: number): bigint {
  if (!Number.isInteger(priceIndex) || priceIndex < 0 || priceIndex > 0xffff) {
    throw new Error(`Invalid priceIndex: ${priceIndex}`);
  }
  return params.minPrice + params.tickSpace * BigInt(priceIndex);
}

export function priceToPriceIndex(params: SeraMarketPricingParams, price: bigint): number {
  if (price < params.minPrice) {
    throw new Error('price < minPrice');
  }
  if (params.tickSpace === 0n) {
    throw new Error('tickSpace is 0');
  }
  const delta = price - params.minPrice;
  const idx = delta / params.tickSpace;
  if (params.minPrice + idx * params.tickSpace !== price) {
    throw new Error('price is not aligned to tickSpace');
  }
  if (idx < 0n || idx > 0xffffn) {
    throw new Error('priceIndex out of range');
  }
  return Number(idx);
}

export function quoteAmountToRawAmount(params: SeraMarketPricingParams, quoteAmount: bigint): bigint {
  if (params.quoteUnit === 0n) throw new Error('quoteUnit is 0');
  return quoteAmount / params.quoteUnit;
}

export function rawAmountToQuoteAmount(params: SeraMarketPricingParams, rawAmount: bigint): bigint {
  return rawAmount * params.quoteUnit;
}

export function parseUnitsSafe(value: string, decimals: number): bigint {
  try {
    return ethers.parseUnits(value, decimals);
  } catch (e) {
    throw new Error(`Invalid decimal amount '${value}' for decimals=${decimals}`);
  }
}

export function formatUnitsSafe(value: bigint, decimals: number): string {
  return ethers.formatUnits(value, decimals);
}
