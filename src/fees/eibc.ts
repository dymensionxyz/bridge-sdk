/**
 * EIBC (Expedited IBC) fee calculation for RollApp withdrawals
 */

import type { EibcWithdrawalResult } from './types.js';
import { multiplyByRate } from './bridging.js';

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
  const eibcFee = multiplyByRate(amount, eibcFeePercent / 100);
  const bridgingFee = multiplyByRate(amount, bridgingFeeRate);
  const recipientReceives = amount - eibcFee - bridgingFee;

  return { eibcFee, bridgingFee, recipientReceives };
}

/**
 * Precision for bigint decimal arithmetic (18 decimal places)
 */
const PRECISION = 10n ** 18n;

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
  const totalFeeRateBig = BigInt(Math.floor(totalFeeRate * Number(PRECISION)));
  const oneMinusFee = PRECISION - totalFeeRateBig;
  // Round up using: (a + b - 1) / b
  return (desiredRecipientAmount * PRECISION + oneMinusFee - 1n) / oneMinusFee;
}
