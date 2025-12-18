export * from './constants.js';
export * from './rpc.js';
export * from './types.js';
export * from './chains.js';
export * from './tokens.js';

import type { DymensionBridgeConfig, ResolvedConfig } from './types.js';
import { DEFAULT_RPC_URLS, DEFAULT_REST_URLS, DEFAULT_GRPC_URLS } from './rpc.js';
import { CHAINS, getHyperlaneDomain, type Network } from './chains.js';

/**
 * Build domain map from CHAINS for a given network
 */
function buildDomainMap(network: Network): Record<string, number> {
  const domains: Record<string, number> = {};
  for (const [name, config] of Object.entries(CHAINS)) {
    if (config.type === 'hyperlane' || config.type === 'hub') {
      domains[name.toUpperCase()] = getHyperlaneDomain(name as keyof typeof CHAINS, network);
    }
  }
  return domains;
}

/**
 * Create a resolved configuration by merging defaults with user overrides
 */
export function createConfig(userConfig: DymensionBridgeConfig = {}): ResolvedConfig {
  const network = userConfig.network ?? 'mainnet';

  return {
    network,
    rpcUrls: {
      ...DEFAULT_RPC_URLS,
      ...userConfig.rpcUrls,
    },
    restUrls: {
      ...DEFAULT_REST_URLS,
      ...userConfig.restUrls,
    },
    grpcUrls: {
      ...DEFAULT_GRPC_URLS,
      ...userConfig.grpcUrls,
    },
    domains: buildDomainMap(network),
    contractOverrides: userConfig.contractOverrides,
  };
}
