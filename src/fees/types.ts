/**
 * Fee-related types
 */

/**
 * Complete breakdown of all fees for a bridge transfer
 */
export interface FeeBreakdown {
  /** Hyperlane bridging fee (protocol fee) */
  bridgingFee: bigint;

  /** EIBC fee for RollApp withdrawals (optional) */
  eibcFee?: bigint;

  /** Interchain gas paymaster fee */
  igpFee: bigint;

  /** Amount recipient will receive after fees */
  recipientReceives: bigint;
}

/**
 * EIBC withdrawal calculation result
 */
export interface EibcWithdrawalResult {
  eibcFee: bigint;
  bridgingFee: bigint;
  recipientReceives: bigint;
}
