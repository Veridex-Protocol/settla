/**
 * Sera GraphQL Client
 * Copied from @veridex/sera to avoid workspace dependency conflicts
 */

import axios, { AxiosInstance } from 'axios';
import { SeraDepth, SeraMarket, SeraOpenOrder } from './types';

export interface SeraGraphQLClientOptions {
  endpoint: string;
  axios?: AxiosInstance;
}

type GraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string }>;
};

export class SeraGraphQLClient {
  private readonly endpoint: string;
  private readonly http: AxiosInstance;

  constructor(opts: SeraGraphQLClientOptions) {
    this.endpoint = opts.endpoint;
    this.http = opts.axios ?? axios.create();
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await this.http.post<GraphQLResponse<T>>(
      this.endpoint,
      { query, variables },
      { headers: { 'content-type': 'application/json' } }
    );

    if (res.data.errors?.length) {
      throw new Error(res.data.errors.map((e) => e.message).join('; '));
    }
    if (!res.data.data) {
      throw new Error('GraphQL response missing data');
    }
    return res.data.data;
  }

  async listMarkets(first = 100): Promise<SeraMarket[]> {
    const q = `
      query GetAllMarkets($first: Int!) {
        markets(first: $first) {
          id
          quoteToken { symbol decimals }
          baseToken { symbol decimals }
          minPrice
          tickSpace
          quoteUnit
          latestPrice
          latestPriceIndex
        }
      }
    `;

    const data = await this.query<{ markets: SeraMarket[] }>(q, { first });
    return data.markets;
  }

  async getUserOpenOrders(user: string, statuses: string[] = ['open', 'partial']): Promise<SeraOpenOrder[]> {
    const q = `
      query GetUserOrders($user: String!, $statuses: [String!]) {
        openOrders(
          where: { user: $user, status_in: $statuses }
          orderBy: createdAt
          orderDirection: desc
        ) {
          id
          nftId
          user
          market
          isBid
          priceIndex
          rawAmount
          rawFilledAmount
          claimableAmount
          status
          createdAt
        }
      }
    `;

    const data = await this.query<{ openOrders: SeraOpenOrder[] }>(q, { user: user.toLowerCase(), statuses });
    return data.openOrders;
  }

  async getDepths(market: string, first = 50): Promise<SeraDepth[]> {
    const q = `
      query GetDepths($market: String!, $first: Int!) {
        depths(where: { market: $market, rawAmount_gt: "0" }, first: $first) {
          priceIndex
          price
          isBid
          rawAmount
        }
      }
    `;

    const data = await this.query<{ depths: SeraDepth[] }>(q, { market: market.toLowerCase(), first });
    return data.depths;
  }
}
