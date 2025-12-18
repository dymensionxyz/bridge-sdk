/**
 * IBC timeout utilities
 */

/**
 * Nanoseconds per second for IBC timeout calculations
 */
export const NANOS_PER_SECOND = 1_000_000_000n;

/**
 * Default IBC timeout in minutes
 */
export const DEFAULT_IBC_TIMEOUT_MINUTES = 5;

/**
 * Create an IBC timeout timestamp (nanoseconds since epoch)
 *
 * @param minutesFromNow - Minutes until timeout (default: 5)
 * @returns Timeout timestamp in nanoseconds as bigint
 */
export function createIbcTimeoutTimestamp(minutesFromNow = DEFAULT_IBC_TIMEOUT_MINUTES): bigint {
  const secondsFromNow = minutesFromNow * 60;
  return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow) * NANOS_PER_SECOND;
}
