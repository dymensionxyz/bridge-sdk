/**
 * Default RPC endpoints from Hyperlane Registry
 */

/**
 * Default RPC URLs by chain name
 */
export const DEFAULT_RPC_URLS: Record<string, string> = {
  // Ethereum
  ethereum: 'https://eth.llamarpc.com',

  // Base
  base: 'https://mainnet.base.org',

  // BSC
  bsc: 'https://bsc.drpc.org',

  // Solana
  solanamainnet: 'https://api.mainnet-beta.solana.com',
  solanatestnet: 'https://api.testnet.solana.com',

  // NOTE: Dymension RPCs must be provided by the caller
};

/**
 * Default REST API URLs for Cosmos chains
 * NOTE: Dymension REST URL must be provided by the caller via FeeProviderConfig.hubRestUrl
 */
export const DEFAULT_REST_URLS: Record<string, string> = {};

/**
 * Default gRPC URLs for Cosmos chains
 * NOTE: Dymension gRPC URL must be provided by the caller
 */
export const DEFAULT_GRPC_URLS: Record<string, string> = {};
