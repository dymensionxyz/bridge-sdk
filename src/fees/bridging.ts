/**
 * Bridging fee calculation
 */

/**
 * Precision for bigint decimal arithmetic (18 decimal places)
 */
const PRECISION = 10n ** 18n;

/**
 * Multiply a bigint by a decimal rate using bigint arithmetic to avoid precision loss.
 * Uses 18 decimal places of precision.
 *
 * @param amount - The bigint amount
 * @param rate - The decimal rate (e.g., 0.001 for 0.1%)
 * @returns amount * rate (floored)
 */
export function multiplyByRate(amount: bigint, rate: number): bigint {
  const rateBig = BigInt(Math.floor(rate * Number(PRECISION)));
  return (amount * rateBig) / PRECISION;
}

/**
 * Calculate the bridging fee for a Hub Hyperlane transfer
 *
 * @param amount - Transfer amount in base units
 * @param outboundFeeRate - Fee rate as decimal (e.g., 0.02 for 2%)
 * @returns Fee amount in base units
 */
export function calculateBridgingFee(
  amount: bigint,
  outboundFeeRate: number
): bigint {
  return multiplyByRate(amount, outboundFeeRate);
}

/**
 * Calculate amount after bridging fee deduction
 *
 * @param amount - Transfer amount in base units
 * @param outboundFeeRate - Fee rate as decimal
 * @returns Amount recipient receives
 */
export function calculateAmountAfterBridgingFee(
  amount: bigint,
  outboundFeeRate: number
): bigint {
  const fee = calculateBridgingFee(amount, outboundFeeRate);
  return amount - fee;
}

/**
 * Calculate amount to send to achieve desired recipient amount
 *
 * @param desiredAmount - Amount recipient should receive
 * @param outboundFeeRate - Fee rate as decimal
 * @returns Amount to send (before fee)
 */
export function calculateSendAmountForDesired(
  desiredAmount: bigint,
  outboundFeeRate: number
): bigint {
  // amount = desired / (1 - feeRate)
  // Use bigint arithmetic: amount = desiredAmount * PRECISION / (PRECISION * (1 - feeRate))
  const rateBig = BigInt(Math.floor(outboundFeeRate * Number(PRECISION)));
  const oneMinusRate = PRECISION - rateBig;
  // Round up using: (a + b - 1) / b
  return (desiredAmount * PRECISION + oneMinusRate - 1n) / oneMinusRate;
}
