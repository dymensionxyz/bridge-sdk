/**
 * Default RPC endpoints from Hyperlane Registry
 */

/**
 * Default RPC URLs by chain name
 */
export const DEFAULT_RPC_URLS: Record<string, string> = {
  // Dymension Hub
  dymension: 'https://rpc-dymension.mzonder.com:443',

  // Ethereum
  ethereum: 'https://eth.llamarpc.com',

  // Base
  base: 'https://mainnet.base.org',

  // BSC
  bsc: 'https://bsc.drpc.org',

  // Solana
  solanamainnet: 'https://api.mainnet-beta.solana.com',
  solanatestnet: 'https://api.testnet.solana.com',
};

/**
 * Default REST API URLs for Cosmos chains
 */
export const DEFAULT_REST_URLS: Record<string, string> = {
  dymension: 'https://api-dymension.mzonder.com:443',
};

/**
 * Default gRPC URLs for Cosmos chains
 */
export const DEFAULT_GRPC_URLS: Record<string, string> = {
  dymension: 'https://grpc-dymension.mzonder.com:443',
};
