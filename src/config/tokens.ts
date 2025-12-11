/**
 * Token registry mapping symbols to addresses, IDs, and denoms
 *
 * This module provides a unified registry of all supported tokens,
 * including their addresses on each chain, Hub token IDs, and IBC denoms.
 */

/** Supported chain names for token addresses */
export type TokenChainName =
  | 'ethereum'
  | 'base'
  | 'bsc'
  | 'solana'
  | 'kaspa'
  | 'dymension'
  | 'noble';

/** Network variant */
export type Network = 'mainnet' | 'testnet';

/** Token configuration */
export interface TokenConfig {
  /** Token symbol (e.g., 'KAS', 'ETH') */
  symbol: string;
  /** Human-readable name */
  displayName: string;
  /** Number of decimal places */
  decimals: number;
  /** Hub warp token ID (32-byte hex) */
  hubTokenId: string;
  /** Denom on Hub (e.g., 'adym', 'ibc/...') */
  hubDenom: string;
  /** Contract addresses on each chain */
  addresses: Partial<Record<TokenChainName, string>>;
  /** Testnet addresses (if different) */
  testnetAddresses?: Partial<Record<TokenChainName, string>>;
}

/**
 * Registry of all supported tokens
 *
 * Token IDs and addresses are from mainnet deployments.
 * Use getToken() or getTokenAddress() for testnet-aware lookups.
 */
export const TOKENS = {
  KAS: {
    symbol: 'KAS',
    displayName: 'Kaspa',
    decimals: 8,
    hubTokenId: '0x726f757465725f61707000000000000000000000000000020000000000000000',
    hubDenom: 'ibc/TODO_KAS_DENOM',
    addresses: {
      ethereum: '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF',
      base: '0x9c3dfFBE238B3A472233151a49A99431966De087',
      bsc: '0x8AC2505B0Fe4F73c7A0FCc5c63DB2bCBb1221357',
      kaspa: 'native',
    },
    testnetAddresses: {
      kaspa: 'native',
    },
  },
  ETH: {
    symbol: 'ETH',
    displayName: 'Ethereum',
    decimals: 18,
    hubTokenId: '0x726f757465725f61707000000000000000000000000000020000000000000002',
    hubDenom: 'ibc/TODO_ETH_DENOM',
    addresses: {
      ethereum: '0x4E19c3E50a9549970f5b7fDAb76c9bE71C878641',
    },
  },
  DYM: {
    symbol: 'DYM',
    displayName: 'Dymension',
    decimals: 18,
    hubTokenId: '0x726f757465725f61707000000000000000000000000000010000000000000001',
    hubDenom: 'adym',
    addresses: {
      ethereum: '0x408C4ECBe5D68a135be87e01aDaf91906e982127',
      base: '0x19CCc0859A26fF815E48aA89820691c306253C5a',
      bsc: '0x98ddD4fDff5a2896D1Bd6A1d668FD3D305E8E724',
      dymension: 'native',
    },
  },
  SOL: {
    symbol: 'SOL',
    displayName: 'Solana',
    decimals: 9,
    hubTokenId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO
    hubDenom: 'ibc/TODO_SOL_DENOM',
    addresses: {
      solana: 'So11111111111111111111111111111111111111112',
    },
    testnetAddresses: {
      solana: 'So11111111111111111111111111111111111111112',
    },
  },
  USDC: {
    symbol: 'USDC',
    displayName: 'USD Coin',
    decimals: 6,
    hubTokenId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO
    hubDenom: 'ibc/TODO_USDC_DENOM',
    addresses: {
      solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      noble: 'uusdc',
    },
    testnetAddresses: {
      solana: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp',
    },
  },
  USDT: {
    symbol: 'USDT',
    displayName: 'Tether USD',
    decimals: 6,
    hubTokenId: '0x0000000000000000000000000000000000000000000000000000000000000000', // TODO
    hubDenom: 'ibc/TODO_USDT_DENOM',
    addresses: {
      solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    },
    testnetAddresses: {
      solana: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    },
  },
} as const;

export type TokenSymbol = keyof typeof TOKENS;

/**
 * Get token configuration by symbol
 */
export function getToken(symbol: TokenSymbol): TokenConfig {
  const config = TOKENS[symbol];
  if (!config) {
    throw new Error(`Unknown token: ${symbol}`);
  }
  return config as TokenConfig;
}

/**
 * Get token address on a specific chain
 */
export function getTokenAddress(
  symbol: TokenSymbol,
  chain: TokenChainName,
  network: Network = 'mainnet'
): string {
  const token = getToken(symbol);

  // Check testnet addresses first if on testnet
  if (network === 'testnet' && token.testnetAddresses) {
    const testnetAddr = token.testnetAddresses[chain];
    if (testnetAddr) return testnetAddr;
  }

  // Fall back to mainnet addresses
  const addr = token.addresses[chain];
  if (!addr) {
    throw new Error(`Token ${symbol} not available on chain ${chain}`);
  }
  return addr;
}

/**
 * Get Hub token ID for a token
 */
export function getHubTokenId(symbol: TokenSymbol): string {
  return getToken(symbol).hubTokenId;
}

/**
 * Get Hub denom for a token
 */
export function getHubDenom(symbol: TokenSymbol): string {
  return getToken(symbol).hubDenom;
}

/**
 * Get token decimals
 */
export function getTokenDecimals(symbol: TokenSymbol): number {
  return getToken(symbol).decimals;
}

/**
 * Check if a token is available on a chain
 */
export function isTokenAvailableOnChain(
  symbol: TokenSymbol,
  chain: TokenChainName,
  network: Network = 'mainnet'
): boolean {
  const token = getToken(symbol);
  if (!token) return false;

  if (network === 'testnet' && token.testnetAddresses?.[chain]) {
    return true;
  }

  return !!token.addresses[chain];
}

/**
 * Get all available tokens on a chain
 */
export function getTokensOnChain(chain: TokenChainName, network: Network = 'mainnet'): TokenSymbol[] {
  return (Object.keys(TOKENS) as TokenSymbol[]).filter((symbol) =>
    isTokenAvailableOnChain(symbol, chain, network)
  );
}

/**
 * Get all token symbols
 */
export function getAllTokenSymbols(): TokenSymbol[] {
  return Object.keys(TOKENS) as TokenSymbol[];
}
