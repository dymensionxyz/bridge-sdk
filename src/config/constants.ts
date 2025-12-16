/**
 * Hardcoded constants for Dymension bridging
 */

import { getHyperlaneDomain } from './chains.js';

/**
 * Hyperlane domain IDs for supported chains
 * @deprecated Use getHyperlaneDomain() instead
 */
export const DOMAINS = {
  DYMENSION_MAINNET: getHyperlaneDomain('dymension', 'mainnet'),
  DYMENSION_TESTNET: getHyperlaneDomain('dymension', 'testnet'),
  KASPA_MAINNET: getHyperlaneDomain('kaspa', 'mainnet'),
  KASPA_TESTNET: getHyperlaneDomain('kaspa', 'testnet'),
  ETHEREUM: getHyperlaneDomain('ethereum', 'mainnet'),
  BASE: getHyperlaneDomain('base', 'mainnet'),
  BSC: getHyperlaneDomain('bsc', 'mainnet'),
  SOLANA_MAINNET: getHyperlaneDomain('solana', 'mainnet'),
  SOLANA_TESTNET: getHyperlaneDomain('solana', 'testnet'),
} as const;

/**
 * Hub warp token IDs (32-byte hex)
 */
export const HUB_TOKEN_IDS = {
  KAS: '0x726f757465725f61707000000000000000000000000000020000000000000000',
  ETH: '0x726f757465725f61707000000000000000000000000000020000000000000002',
  DYM: '0x726f757465725f61707000000000000000000000000000010000000000000001',
} as const;

/**
 * Ethereum mainnet warp route contracts
 */
export const ETHEREUM_CONTRACTS = {
  ETH_WARP: '0x4E19c3E50a9549970f5b7fDAb76c9bE71C878641',
  DYM_WARP: '0x408C4ECBe5D68a135be87e01aDaf91906e982127',
  KAS_WARP: '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF',
} as const;

/**
 * Base mainnet warp route contracts
 */
export const BASE_CONTRACTS = {
  DYM_WARP: '0x19CCc0859A26fF815E48aA89820691c306253C5a',
  KAS_WARP: '0x9c3dfFBE238B3A472233151a49A99431966De087',
} as const;

/**
 * BSC mainnet warp route contracts
 */
export const BSC_CONTRACTS = {
  DYM_WARP: '0x98ddD4fDff5a2896D1Bd6A1d668FD3D305E8E724',
  KAS_WARP: '0x8AC2505B0Fe4F73c7A0FCc5c63DB2bCBb1221357',
} as const;

/**
 * Kaspa-specific constants
 */
export const KASPA = {
  ESCROW_MAINNET: 'kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh',
  ESCROW_TESTNET: 'kaspatest:pzwcd30pvdn0k4snvj5awkmlm6srzuw8d8e766ff5vwceg2akta3799nq2a3p',
  MIN_DEPOSIT_SOMPI: 4_000_000_000n, // 40 KAS
  SOMPI_PER_KAS: 100_000_000n,
} as const;

/**
 * Solana-specific constants
 */
export const SOLANA = {
  PROGRAMS_MAINNET: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  PROGRAMS_TESTNET: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'CpMah17kQEL2wqyMKt3mZBdTnZbkbfx4nqmQMFDP5vwp',
    USDT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  },
  COMPUTE_UNIT_LIMIT: 1_000_000,
  DEFAULT_PRIORITY_FEE: 100_000,
  MINIMUM_TRANSFER_LAMPORTS: 5000,
} as const;

/**
 * Hub mailbox address (32-byte hex)
 */
export const HUB_MAILBOX = '0x68797065726c616e650000000000000000000000000000000000000000000000';

/**
 * Hub IGP (Interchain Gas Paymaster) hook IDs
 *
 * Each IGP accepts a specific token denomination for gas payment.
 * When transferring FROM Hub to EVM chains, users must pay the IGP
 * that accepts the token they're transferring.
 */
export const HUB_IGP_HOOKS = {
  /** IGP accepting DYM (adym) - 18 decimals */
  DYM: '0x726f757465725f61707000000000000000000000000000000000000000000001',
  /** IGP accepting KAS - 8 decimals */
  KAS: '0x726f757465725f61707000000000000000000000000000000000000000000005',
  /** IGP accepting ETH - 18 decimals */
  ETH: '0x726f757465725f61707000000000000000000000000000000000000000000006',
} as const;

export type IgpTokenSymbol = keyof typeof HUB_IGP_HOOKS;

