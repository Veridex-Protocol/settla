import { AbiCoder, getAddress, keccak256, toUtf8Bytes } from 'ethers';

/**
 * EIP-712 type hash for SeraSOR's Intent struct.
 *
 * Mirrors the Solidity definition in SeraSOR.sol:
 *   keccak256(
 *     "Intent(address taker,address inputToken,address outputToken,"
 *     "uint256 maxInputAmount,uint256 minOutputAmount,address recipient,"
 *     "uint256 initialDepositAmount,uint256 uuid,uint48 deadline)"
 *   )
 *
 * The contract emits this struct hash directly via
 * `IntentMatched(bytes32 indexed intentHash, address indexed taker, uint256 legCount)`.
 * It is *not* the full EIP-712 digest (no domain separator wrap).
 */
export const INTENT_TYPEHASH = keccak256(
  toUtf8Bytes(
    'Intent(address taker,address inputToken,address outputToken,uint256 maxInputAmount,uint256 minOutputAmount,address recipient,uint256 initialDepositAmount,uint256 uuid,uint48 deadline)'
  )
);

/**
 * Topic[0] for `IntentMatched(bytes32,address,uint256)` on SeraSOR.
 */
export const INTENT_MATCHED_TOPIC = keccak256(
  toUtf8Bytes('IntentMatched(bytes32,address,uint256)')
);

export interface IntentRouteParams {
  taker: string;
  inputToken: string;
  outputToken: string;
  maxInputAmount: string | number | bigint;
  minOutputAmount: string | number | bigint;
  recipient: string;
  initialDepositAmount: string | number | bigint;
  uuid: string | number | bigint;
  deadline: string | number | bigint;
}

/**
 * Recompute the on-chain intent struct hash from Sera `/swap/quote` `route_params`.
 *
 * Used to look up settlements via SOR `IntentMatched` logs without trusting
 * any off-chain trade id mapping.
 */
export function computeIntentHash(params: IntentRouteParams): string {
  const coder = AbiCoder.defaultAbiCoder();
  return keccak256(
    coder.encode(
      [
        'bytes32',
        'address',
        'address',
        'address',
        'uint256',
        'uint256',
        'address',
        'uint256',
        'uint256',
        'uint48',
      ],
      [
        INTENT_TYPEHASH,
        getAddress(params.taker),
        getAddress(params.inputToken),
        getAddress(params.outputToken),
        BigInt(params.maxInputAmount),
        BigInt(params.minOutputAmount),
        getAddress(params.recipient),
        BigInt(params.initialDepositAmount),
        BigInt(params.uuid),
        BigInt(params.deadline),
      ]
    )
  );
}
