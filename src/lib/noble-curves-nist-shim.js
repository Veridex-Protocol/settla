/**
 * Shim for @noble/curves/nist.js compatibility
 * 
 * The @aptos-labs/ts-sdk imports from '@noble/curves/nist.js' which doesn't exist
 * in older versions of @noble/curves. This shim re-exports from the correct paths.
 */

// In @noble/curves@1.2.0, p256 is exported from the p256 submodule
export { p256 } from '@noble/curves/p256';
export { p384 } from '@noble/curves/p384';
export { p521 } from '@noble/curves/p521';
