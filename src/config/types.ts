/**
 * Configuration types for the bridge SDK
 */

import type { FeeProvider } from '../fees/provider.js';

/**
 * User-provided configuration (all optional)
 */
export interface DymensionBridgeConfig {
  /** Network to use */
  network?: 'mainnet' | 'testnet';

  /** RPC URL overrides by chain name */
  rpcUrls?: Record<string, string>;

  /** REST API URL overrides by chain name */
  restUrls?: Record<string, string>;

  /** gRPC URL overrides by chain name */
  grpcUrls?: Record<string, string>;

  /** Contract address overrides (for testing) */
  contractOverrides?: {
    warpRoutes?: Record<string, string>;
    igp?: Record<string, string>;
    mailbox?: Record<string, string>;
  };

  /** Custom fee provider for dynamic fee fetching */
  feeProvider?: FeeProvider;
}

/**
 * Fully resolved configuration with defaults applied
 */
export interface ResolvedConfig {
  network: 'mainnet' | 'testnet';
  rpcUrls: Record<string, string>;
  restUrls: Record<string, string>;
  grpcUrls: Record<string, string>;
  domains: Record<string, number>;
  contractOverrides?: DymensionBridgeConfig['contractOverrides'];
}
