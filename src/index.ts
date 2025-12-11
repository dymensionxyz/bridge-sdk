/**
 * @dymension/bridge-sdk
 *
 * Programmatic bridging SDK for Dymension Hyperlane integration
 */

// Main client
export { createBridgeClient, BridgeClient } from './client.js';

// Configuration
export {
  DOMAINS,
  HUB_TOKEN_IDS,
  ETHEREUM_CONTRACTS,
  BASE_CONTRACTS,
  BSC_CONTRACTS,
  KASPA,
  HUB_MAILBOX,
} from './config/constants.js';
export { DEFAULT_RPC_URLS, DEFAULT_REST_URLS } from './config/rpc.js';
export type { DymensionBridgeConfig, ResolvedConfig } from './config/types.js';

// Fee utilities
export {
  calculateBridgingFee,
  calculateEibcWithdrawal,
  calculateEibcSendAmount,
  DEFAULT_BRIDGING_FEE_RATE,
  DEFAULT_EIBC_FEE_PERCENT,
  DEFAULT_GAS_AMOUNTS,
} from './fees/index.js';
export type { FeeBreakdown } from './fees/index.js';

// Forward utilities
export {
  createRollAppToHyperlaneMemo,
  createIBCToHyperlaneMemo,
  createHLMetadataForIBC,
  createHLMetadataForHL,
  HOOK_NAMES,
} from './forward/index.js';
export type {
  RollAppToHyperlaneParams,
  IBCToHyperlaneParams,
  HLToIBCParams,
  HLToHLParams,
  MsgRemoteTransferFields,
  HLMetadataFields,
} from './forward/index.js';

// Address utilities
export {
  cosmosAddressToHyperlane,
  evmAddressToHyperlane,
  solanaAddressToHyperlane,
  kaspaAddressToHyperlane,
} from './utils/address.js';

// Adapters
export {
  // Hub adapter (class-based)
  HubAdapter,
  createHubAdapter,
  getMainnetWarpRoutes,
  // Hub to Kaspa (standalone function)
  populateHubToKaspaTx,
  DEFAULT_HUB_TO_KASPA_IGP,
  // EVM adapter (function-based)
  populateEvmToHubTransfer,
  populateEvmToHubWithForwarding,
  getEvmTokenContract,
  estimateEvmToHubGas,
  // Solana adapter (function-based)
  buildSolanaToHubTx,
  buildSolanaToHubWithForwardingTx,
  getSolanaWarpProgramId,
  deriveAssociatedTokenAccount,
  // Kaspa utilities
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
} from './adapters/index.js';
export type {
  KaspaDepositParams,
  HubToEvmParams,
  HubToKaspaParams,
  MsgRemoteTransfer,
  WarpRouteAddresses,
  MsgExecuteContract,
  EvmToHubTransferParams,
  EvmToHubWithForwardingParams,
  SolanaToHubParams,
  SolanaToHubWithForwardingParams,
  HubToSolanaParams,
} from './adapters/index.js';
