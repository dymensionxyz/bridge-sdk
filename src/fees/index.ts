/**
 * Fee calculation utilities
 */

export * from './bridging.js';
export * from './eibc.js';
export * from './types.js';
export * from './provider.js';
export * from './defaults.js';

// Re-export for backwards compatibility (prefer importing from defaults.js directly)
export {
  DEFAULT_BRIDGING_FEE_RATE,
  DEFAULT_EIBC_FEE_PERCENT,
  DEFAULT_GAS_LIMITS as DEFAULT_GAS_AMOUNTS,
} from './defaults.js';
