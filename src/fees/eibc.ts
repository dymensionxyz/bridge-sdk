/**
 * EIBC (Expedited IBC) fee calculation for RollApp withdrawals
 */

import type { EibcWithdrawalResult } from './types.js';

/**
 * Calculate fees for an EIBC withdrawal from a RollApp
 *
 * @param amount - Transfer amount in base units
 * @param eibcFeePercent - EIBC fee as percentage (e.g., 0.5 for 0.5%)
 * @param bridgingFeeRate - Bridging fee rate as decimal (get from FeeProvider.getBridgingFeeRate)
 * @returns Breakdown of fees and recipient amount
 */
export function calculateEibcWithdrawal(
  amount: bigint,
  eibcFeePercent: number,
  bridgingFeeRate: number
): EibcWithdrawalResult {
  const eibcFee = BigInt(Math.floor(Number(amount) * eibcFeePercent / 100));
  const bridgingFee = BigInt(Math.floor(Number(amount) * bridgingFeeRate));
  const recipientReceives = amount - eibcFee - bridgingFee;

  return { eibcFee, bridgingFee, recipientReceives };
}

/**
 * Calculate amount to send for desired recipient amount (after EIBC fees)
 *
 * @param desiredRecipientAmount - Amount recipient should receive
 * @param eibcFeePercent - EIBC fee as percentage
 * @param bridgingFeeRate - Bridging fee rate as decimal (get from FeeProvider.getBridgingFeeRate)
 * @returns Amount to send (before fees)
 */
export function calculateEibcSendAmount(
  desiredRecipientAmount: bigint,
  eibcFeePercent: number,
  bridgingFeeRate: number
): bigint {
  // amount = desired / (1 - eibcFee% - bridgingFee%)
  const totalFeeRate = (eibcFeePercent / 100) + bridgingFeeRate;
  return BigInt(Math.ceil(Number(desiredRecipientAmount) / (1 - totalFeeRate)));
}
