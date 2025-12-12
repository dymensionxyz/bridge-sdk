/**
 * @dymension/bridge-sdk
 *
 * Programmatic bridging SDK for Dymension Hyperlane integration
 */

// Main client
export { createBridgeClient, BridgeClient } from './client.js';
export type { TransferParams, TransferResult } from './client.js';

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

// Chain registry
export {
  CHAINS,
  getChainConfig,
  getHyperlaneDomain,
  getIBCChannelFromHub,
  getIBCChannelToHub,
  isHyperlaneChain,
  isIBCChain,
  getAllChainNames,
  getHyperlaneChainNames,
  getIBCChainNames,
} from './config/chains.js';
export type {
  ChainType,
  Network,
  ChainConfig,
  HyperlaneChainConfig,
  IBCChainConfig,
  HubChainConfig,
  ChainName,
} from './config/chains.js';

// Token registry
export {
  TOKENS,
  getToken,
  getTokenAddress,
  getHubTokenId,
  getHubDenom,
  getTokenDecimals,
  isTokenAvailableOnChain,
  getTokensOnChain,
  getAllTokenSymbols,
} from './config/tokens.js';
export type { TokenConfig, TokenSymbol, TokenChainName } from './config/tokens.js';

// Fee utilities
export {
  calculateBridgingFee,
  calculateEibcWithdrawal,
  calculateEibcSendAmount,
  calculateForwardingFees,
  calculateForwardingSendAmount,
  validateForwardingParams,
  DEFAULT_EIBC_FEE_PERCENT,
  // FeeProvider for dynamic fee fetching
  FeeProvider,
  createFeeProvider,
  HUB_REST_ENDPOINTS,
} from './fees/index.js';
export type {
  FeeBreakdown,
  FeeProviderConfig,
  HLFeeHook,
  HLAssetFee,
  IgpQuoteResponse,
  DelayedAckParams,
  ForwardingRouteType,
  Hop1Fees,
  Hop2Fees,
  ForwardingCalculation,
  ForwardingParams,
} from './fees/index.js';

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
  // Hub adapter (standalone functions for native warp module)
  populateHubToEvmTx,
  populateHubToKaspaTx,
  populateHubToSolanaTx,
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
  HubToSolanaParams,
  MsgRemoteTransfer,
  EvmToHubTransferParams,
  EvmToHubWithForwardingParams,
  SolanaToHubParams,
  SolanaToHubWithForwardingParams,
} from './adapters/index.js';
