/**
 * Sera Exchange SDK - Local Integration
 * 
 * This module provides all Sera exchange functionality directly
 * without requiring the @veridex/sera package dependency.
 * 
 * This avoids workspace/file dependency conflicts with bun.
 */

// Types
export * from './types';

// GraphQL Client
export { SeraGraphQLClient } from './graphql';
export type { SeraGraphQLClientOptions } from './graphql';

// Router (on-chain trading)
export { createSeraRouter } from './router';
export type { SeraRouterConfig, LimitParams, MarketParams } from './router';

// Price utilities
export {
  priceIndexToPrice,
  priceToPriceIndex,
  quoteAmountToRawAmount,
  rawAmountToQuoteAmount,
  parseUnitsSafe,
  formatUnitsSafe,
} from './price';
export type { SeraMarketPricingParams } from './price';
