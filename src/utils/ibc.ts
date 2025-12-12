/**
 * IBC timeout utilities
 */

/**
 * Nanoseconds per second for IBC timeout calculations
 */
export const NANOS_PER_SECOND = 1_000_000_000n;

/**
 * Default IBC timeout in hours
 */
export const DEFAULT_IBC_TIMEOUT_HOURS = 1;

/**
 * Create an IBC timeout timestamp (nanoseconds since epoch)
 *
 * @param hoursFromNow - Hours until timeout (default: 1)
 * @returns Timeout timestamp in nanoseconds as bigint
 */
export function createIbcTimeoutTimestamp(hoursFromNow = DEFAULT_IBC_TIMEOUT_HOURS): bigint {
  const secondsFromNow = hoursFromNow * 3600;
  return BigInt(Math.floor(Date.now() / 1000) + secondsFromNow) * NANOS_PER_SECOND;
}
