/**
 * Bridging fee calculation
 */

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
  return BigInt(Math.floor(Number(amount) * outboundFeeRate));
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
  return BigInt(Math.ceil(Number(desiredAmount) / (1 - outboundFeeRate)));
}
