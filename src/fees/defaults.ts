/**
 * Default fee values - single source of truth for all fee constants
 *
 * All hardcoded fee defaults are consolidated here.
 * The FeeProvider attempts to fetch live values from chain;
 * these defaults are used as fallbacks when queries fail.
 */

import { DOMAINS } from '../config/constants.js';

/**
 * Default bridging fee rate (0.1%)
 * Applied to all Hyperlane bridge transfers
 */
export const DEFAULT_BRIDGING_FEE_RATE = 0.001;

/**
 * Default EIBC fee percentage (0.15%)
 * Applied when using eIBC for fast finality on rollapp transfers
 */
export const DEFAULT_EIBC_FEE_PERCENT = 0.15;

/**
 * Default gas limits by destination domain
 * Used for IGP payment calculations when gas limit not specified
 */
export const DEFAULT_GAS_LIMITS: Record<number, number> = {
  [DOMAINS.ETHEREUM]: 200_000,
  [DOMAINS.BASE]: 200_000,
  [DOMAINS.BSC]: 200_000,
  [DOMAINS.SOLANA_MAINNET]: 400_000,
  [DOMAINS.SOLANA_TESTNET]: 400_000,
  [DOMAINS.DYMENSION_MAINNET]: 300_000,
  [DOMAINS.DYMENSION_TESTNET]: 300_000,
  [DOMAINS.KASPA_MAINNET]: 200_000,
  [DOMAINS.KASPA_TESTNET]: 200_000,
};

/**
 * Default IGP fees in adym (18 decimals) by destination domain
 * Used as fallback when live IGP quote queries fail
 */
export const DEFAULT_IGP_FEES: Record<number, bigint> = {
  [DOMAINS.ETHEREUM]: 100_000_000_000_000_000n, // 0.1 DYM
  [DOMAINS.BASE]: 50_000_000_000_000_000n, // 0.05 DYM
  [DOMAINS.BSC]: 50_000_000_000_000_000n, // 0.05 DYM
  [DOMAINS.SOLANA_MAINNET]: 100_000_000_000_000_000n, // 0.1 DYM
  [DOMAINS.SOLANA_TESTNET]: 100_000_000_000_000_000n, // 0.1 DYM
  [DOMAINS.KASPA_MAINNET]: 100_000_000_000_000_000n, // 0.1 DYM
  [DOMAINS.KASPA_TESTNET]: 100_000_000_000_000_000n, // 0.1 DYM
};

/**
 * Universal fallback IGP fee (0.1 DYM)
 */
export const DEFAULT_IGP_FEE_FALLBACK = 100_000_000_000_000_000n;

/**
 * Get default IGP fee for a destination domain
 */
export function getDefaultIgpFee(destinationDomain: number): bigint {
  return DEFAULT_IGP_FEES[destinationDomain] ?? DEFAULT_IGP_FEE_FALLBACK;
}

/**
 * Get default gas limit for a destination domain
 */
export function getDefaultGasLimit(destinationDomain: number): number {
  return DEFAULT_GAS_LIMITS[destinationDomain] ?? 100_000;
}
