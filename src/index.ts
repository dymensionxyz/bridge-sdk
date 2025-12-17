/**
 * @dymension/bridge-sdk
 *
 * Programmatic bridging SDK for Dymension Hyperlane integration
 */

// =============================================================================
// Core Client API
// =============================================================================

export { createBridgeClient, BridgeClient } from './client.js';
export type { TransferParams, TransferResult } from './client.js';

// =============================================================================
// Essential Types
// =============================================================================

export type { ChainName, Network } from './config/chains.js';
export type { TokenSymbol } from './config/tokens.js';
export type { FeeBreakdown } from './fees/index.js';

// =============================================================================
// CosmJS Integration
// =============================================================================

// Required for signing MsgRemoteTransfer with CosmJS
export { createHyperlaneRegistry } from './proto/index.js';

// =============================================================================
// Manual IBC Forwarding
// =============================================================================

// For RollApp/IBC sources where the SDK cannot construct the full transaction,
// use these utilities to build forwarding memos for IBC MsgTransfer.

export {
  createRollAppToHyperlaneMemo,
  createIBCToHyperlaneMemo,
  createHLMetadataForIBC,
  createHLMetadataForHL,
} from './forward/index.js';

export type {
  RollAppToHyperlaneParams,
  IBCToHyperlaneParams,
  HLToIBCParams,
  HLToHLParams,
} from './forward/index.js';

// Registry lookups needed for memo construction
export {
  getHyperlaneDomain,
  getIBCChannelFromHub,
} from './config/chains.js';

export {
  getHubTokenId,
  getHubDenom,
} from './config/tokens.js';

// =============================================================================
// Kaspa Utilities
// =============================================================================

// Kaspa signing happens outside the SDK (requires Rust CLI),
// so these utilities are needed to construct the deposit payload.

export {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
} from './adapters/kaspa.js';

// =============================================================================
// Optional Utilities
// =============================================================================

// Fee provider for direct fee queries (useful for UI display before user commits)
export { FeeProvider, createFeeProvider } from './fees/index.js';

// Token utilities for validation and display
export {
  getTokenDecimals,
  isTokenAvailableOnChain,
} from './config/tokens.js';
