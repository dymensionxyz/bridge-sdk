/**
 * Fee calculation utilities
 */

export * from './bridging.js';
export * from './eibc.js';
export * from './types.js';
export * from './provider.js';

import { DOMAINS } from '../config/constants.js';

/**
 * Default bridging fee rate (0.1%)
 */
export const DEFAULT_BRIDGING_FEE_RATE = 0.001;

/**
 * Default EIBC fee percentage (0.15%)
 */
export const DEFAULT_EIBC_FEE_PERCENT = 0.15;

/**
 * Default gas amounts by destination domain
 */
export const DEFAULT_GAS_AMOUNTS: Record<number, number> = {
  [DOMAINS.ETHEREUM]: 200_000,
  [DOMAINS.BASE]: 200_000,
  [DOMAINS.BSC]: 200_000,
  [DOMAINS.SOLANA_MAINNET]: 400_000,
  [DOMAINS.DYMENSION_MAINNET]: 300_000,
};
