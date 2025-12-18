/**
 * Chain registry with Hyperlane domains
 *
 * This module provides a unified registry of all supported chains
 * with their Hyperlane domain IDs.
 */

/** Chain type identifier */
export type ChainType = 'hyperlane' | 'hub';

/** Network variant */
export type Network = 'mainnet' | 'testnet';

/** Base chain configuration */
interface BaseChainConfig {
  /** Human-readable display name */
  displayName: string;
  /** Bech32 address prefix (e.g., 'osmo', 'dym') or address format for non-Cosmos chains */
  addressPrefix: string;
}

/** Hyperlane-connected chain configuration */
export interface HyperlaneChainConfig extends BaseChainConfig {
  type: 'hyperlane';
  /** Hyperlane domain ID */
  domain: number;
  /** Testnet domain ID (if different) */
  testnetDomain?: number;
}

/** Hub chain configuration */
export interface HubChainConfig extends BaseChainConfig {
  type: 'hub';
  /** Hyperlane domain ID */
  domain: number;
  /** Testnet domain ID */
  testnetDomain: number;
  /** Chain ID */
  chainId: string;
  /** Testnet chain ID */
  testnetChainId: string;
}

export type ChainConfig = HyperlaneChainConfig | HubChainConfig;

/**
 * Registry of all supported chains
 *
 * Hyperlane domains are canonical domain IDs.
 */
export const CHAINS = {
  // === Hub ===
  dymension: {
    type: 'hub',
    displayName: 'Dymension',
    addressPrefix: 'dym',
    domain: 1570310961,
    testnetDomain: 482195613,
    chainId: 'dymension_1100-1',
    testnetChainId: 'blumbus_111-1',
  },

  // === Hyperlane chains ===
  ethereum: {
    type: 'hyperlane',
    displayName: 'Ethereum',
    addressPrefix: '0x',
    domain: 1,
    testnetDomain: 11155111, // Sepolia
  },
  base: {
    type: 'hyperlane',
    displayName: 'Base',
    addressPrefix: '0x',
    domain: 8453,
  },
  bsc: {
    type: 'hyperlane',
    displayName: 'BNB Smart Chain',
    addressPrefix: '0x',
    domain: 56,
  },
  solana: {
    type: 'hyperlane',
    displayName: 'Solana',
    addressPrefix: '',
    domain: 1399811149,
    testnetDomain: 1399811150,
  },
  kaspa: {
    type: 'hyperlane',
    displayName: 'Kaspa',
    addressPrefix: 'kaspa:',
    domain: 1082673309,
    testnetDomain: 80808082,
  },
} as const satisfies Record<string, ChainConfig>;

export type ChainName = keyof typeof CHAINS;

/**
 * Get chain configuration by name
 */
export function getChainConfig<T extends ChainName>(name: T): (typeof CHAINS)[T] {
  const config = CHAINS[name];
  if (!config) {
    throw new Error(`Unknown chain: ${name}`);
  }
  return config;
}

/**
 * Get Hyperlane domain ID for a chain
 */
export function getHyperlaneDomain(name: ChainName, network: Network = 'mainnet'): number {
  const config = CHAINS[name];
  if (network === 'testnet' && 'testnetDomain' in config && config.testnetDomain) {
    return config.testnetDomain;
  }
  return config.domain;
}

/**
 * Check if a chain is connected via Hyperlane
 */
export function isHyperlaneChain(name: ChainName): boolean {
  const config = CHAINS[name];
  return config.type === 'hyperlane' || config.type === 'hub';
}

/**
 * Get all chain names
 */
export function getAllChainNames(): ChainName[] {
  return Object.keys(CHAINS) as ChainName[];
}

/**
 * Get all Hyperlane chain names
 */
export function getHyperlaneChainNames(): ChainName[] {
  return getAllChainNames().filter(
    (name) => CHAINS[name].type === 'hyperlane' || CHAINS[name].type === 'hub'
  );
}
