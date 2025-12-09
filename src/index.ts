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
} from './forward/index.js';

// Address utilities
export {
  cosmosAddressToHyperlane,
  evmAddressToHyperlane,
  solanaAddressToHyperlane,
} from './utils/address.js';

// Kaspa adapter
export {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
} from './adapters/index.js';

// EVM adapter
export {
  populateEvmToHubTransfer,
  getEvmTokenContract,
} from './adapters/index.js';
export type {
  EvmChain,
  EvmToken,
  EvmTransactionData,
  EvmToHubTransferParams,
} from './adapters/evm.js';
