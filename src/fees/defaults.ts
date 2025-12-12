/**
 * Default fee values - single source of truth for EIBC fee calculations
 *
 * Note: IGP fees and bridging fee rates should be fetched dynamically
 * using FeeProvider. These are local calculation constants only.
 */

/**
 * Default EIBC fee percentage (0.15%)
 * Applied when using eIBC for fast finality on rollapp transfers
 */
export const DEFAULT_EIBC_FEE_PERCENT = 0.15;
