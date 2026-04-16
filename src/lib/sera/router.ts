/**
 * Sera Router - On-chain trading functions
 * Copied from @veridex/sera to avoid workspace dependency conflicts
 */

import { Contract, JsonRpcProvider, Wallet } from 'ethers';

const ROUTER_ABI = [
  {
    name: 'limitBid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'market', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'claimBounty', type: 'uint32' },
          { name: 'user', type: 'address' },
          { name: 'priceIndex', type: 'uint16' },
          { name: 'rawAmount', type: 'uint64' },
          { name: 'postOnly', type: 'bool' },
          { name: 'useNative', type: 'bool' },
          { name: 'baseAmount', type: 'uint256' }
        ]
      }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'limitAsk',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'market', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'claimBounty', type: 'uint32' },
          { name: 'user', type: 'address' },
          { name: 'priceIndex', type: 'uint16' },
          { name: 'rawAmount', type: 'uint64' },
          { name: 'postOnly', type: 'bool' },
          { name: 'useNative', type: 'bool' },
          { name: 'baseAmount', type: 'uint256' }
        ]
      }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'marketBid',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'market', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'user', type: 'address' },
          { name: 'limitPriceIndex', type: 'uint16' },
          { name: 'rawAmount', type: 'uint64' },
          { name: 'expendInput', type: 'bool' },
          { name: 'useNative', type: 'bool' },
          { name: 'baseAmount', type: 'uint256' }
        ]
      }
    ],
    outputs: []
  },
  {
    name: 'marketAsk',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          { name: 'market', type: 'address' },
          { name: 'deadline', type: 'uint64' },
          { name: 'user', type: 'address' },
          { name: 'limitPriceIndex', type: 'uint16' },
          { name: 'rawAmount', type: 'uint64' },
          { name: 'expendInput', type: 'bool' },
          { name: 'useNative', type: 'bool' },
          { name: 'baseAmount', type: 'uint256' }
        ]
      }
    ],
    outputs: []
  },
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'deadline', type: 'uint64' },
      {
        name: 'paramsList',
        type: 'tuple[]',
        components: [
          { name: 'market', type: 'address' },
          {
            name: 'orderKeys',
            type: 'tuple[]',
            components: [
              { name: 'isBid', type: 'bool' },
              { name: 'priceIndex', type: 'uint16' },
              { name: 'orderIndex', type: 'uint256' }
            ]
          }
        ]
      }
    ],
    outputs: []
  }
] as const;

export interface SeraRouterConfig {
  rpcUrl: string;
  routerAddress: string;
  privateKey?: string;
}

export type LimitParams = {
  market: string;
  deadline: bigint;
  claimBounty: number;
  user: string;
  priceIndex: number;
  rawAmount: bigint;
  postOnly: boolean;
  useNative: boolean;
  baseAmount: bigint;
};

export type MarketParams = {
  market: string;
  deadline: bigint;
  user: string;
  limitPriceIndex: number;
  rawAmount: bigint;
  expendInput: boolean;
  useNative: boolean;
  baseAmount: bigint;
};

export function createSeraRouter(cfg: SeraRouterConfig): {
  provider: JsonRpcProvider;
  signer?: Wallet;
  contract: Contract;
} {
  const provider = new JsonRpcProvider(cfg.rpcUrl);
  const signer = cfg.privateKey ? new Wallet(cfg.privateKey, provider) : undefined;
  const contract = new Contract(cfg.routerAddress, ROUTER_ABI, signer ?? provider);
  if (!signer) return { provider, contract };
  return { provider, signer, contract };
}
