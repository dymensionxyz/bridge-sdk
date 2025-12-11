/**
 * Chain registry with IBC channels and Hyperlane domains
 *
 * This module provides a unified registry of all supported chains,
 * including their IBC channels (for Cosmos chains) and Hyperlane
 * domain IDs (for EVM/Solana/Kaspa chains).
 */

/** Chain type identifier */
export type ChainType = 'hyperlane' | 'ibc' | 'hub';

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

/** IBC-connected chain configuration */
export interface IBCChainConfig extends BaseChainConfig {
  type: 'ibc';
  /** IBC channel from Dymension to this chain */
  channelFromHub: string;
  /** IBC channel from this chain to Dymension */
  channelToHub: string;
  /** Chain ID */
  chainId: string;
  /** Testnet chain ID */
  testnetChainId?: string;
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

export type ChainConfig = HyperlaneChainConfig | IBCChainConfig | HubChainConfig;

/**
 * Registry of all supported chains
 *
 * IBC channels are from Dymension Hub's perspective.
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

  // === IBC chains ===
  osmosis: {
    type: 'ibc',
    displayName: 'Osmosis',
    addressPrefix: 'osmo',
    channelFromHub: 'channel-2',
    channelToHub: 'channel-19774',
    chainId: 'osmosis-1',
    testnetChainId: 'osmo-test-5',
  },
  cosmoshub: {
    type: 'ibc',
    displayName: 'Cosmos Hub',
    addressPrefix: 'cosmos',
    channelFromHub: 'channel-1',
    channelToHub: 'channel-794',
    chainId: 'cosmoshub-4',
  },
  celestia: {
    type: 'ibc',
    displayName: 'Celestia',
    addressPrefix: 'celestia',
    channelFromHub: 'channel-4',
    channelToHub: 'channel-27',
    chainId: 'celestia',
    testnetChainId: 'mocha-4',
  },
  noble: {
    type: 'ibc',
    displayName: 'Noble',
    addressPrefix: 'noble',
    channelFromHub: 'channel-6',
    channelToHub: 'channel-62',
    chainId: 'noble-1',
    testnetChainId: 'grand-1',
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
  if (config.type === 'ibc') {
    throw new Error(`Chain ${name} is an IBC chain, not a Hyperlane chain`);
  }
  if (network === 'testnet' && 'testnetDomain' in config && config.testnetDomain) {
    return config.testnetDomain;
  }
  return config.domain;
}

/**
 * Get IBC channel from Hub to a destination chain
 */
export function getIBCChannelFromHub(destination: ChainName): string {
  const config = CHAINS[destination];
  if (config.type !== 'ibc') {
    throw new Error(`Chain ${destination} is not an IBC chain`);
  }
  return config.channelFromHub;
}

/**
 * Get IBC channel from a source chain to Hub
 */
export function getIBCChannelToHub(source: ChainName): string {
  const config = CHAINS[source];
  if (config.type !== 'ibc') {
    throw new Error(`Chain ${source} is not an IBC chain`);
  }
  return config.channelToHub;
}

/**
 * Check if a chain is connected via Hyperlane
 */
export function isHyperlaneChain(name: ChainName): boolean {
  const config = CHAINS[name];
  return config.type === 'hyperlane' || config.type === 'hub';
}

/**
 * Check if a chain is connected via IBC
 */
export function isIBCChain(name: ChainName): boolean {
  return CHAINS[name].type === 'ibc';
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

/**
 * Get all IBC chain names
 */
export function getIBCChainNames(): ChainName[] {
  return getAllChainNames().filter((name) => CHAINS[name].type === 'ibc');
}
