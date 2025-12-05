export * from './constants.js';
export * from './rpc.js';
export * from './types.js';

import type { DymensionBridgeConfig, ResolvedConfig } from './types.js';
import { DEFAULT_RPC_URLS, DEFAULT_REST_URLS, DEFAULT_GRPC_URLS } from './rpc.js';
import { DOMAINS } from './constants.js';

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
    domains: DOMAINS,
    contractOverrides: userConfig.contractOverrides,
  };
}
