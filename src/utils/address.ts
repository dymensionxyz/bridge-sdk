/**
 * Address conversion utilities for Hyperlane
 *
 * Hyperlane uses 32-byte addresses for all chains.
 * These utilities convert chain-specific addresses to the 32-byte format.
 */

import { fromBech32, toBech32 } from '@cosmjs/encoding';
import bs58 from 'bs58';

/**
 * Convert an EVM address to Hyperlane 32-byte hex format
 *
 * @param address - EVM address (e.g., "0x742d35Cc...")
 * @returns 32-byte hex string with 0x prefix
 */
export function evmAddressToHyperlane(address: string): string {
  const cleaned = address.toLowerCase().replace('0x', '');
  if (!/^[0-9a-f]{40}$/.test(cleaned)) {
    throw new Error('Invalid EVM address format');
  }
  return '0x' + cleaned.padStart(64, '0');
}

/**
 * Convert a Cosmos bech32 address to Hyperlane 32-byte hex format
 *
 * @param bech32Address - Cosmos address (e.g., "dym1...")
 * @returns 32-byte hex string with 0x prefix
 */
export function cosmosAddressToHyperlane(bech32Address: string): string {
  const { data } = fromBech32(bech32Address);
  const padded = new Uint8Array(32);
  padded.set(data, 32 - data.length);
  return '0x' + Buffer.from(padded).toString('hex');
}

/**
 * Convert a Solana address to Hyperlane 32-byte hex format
 *
 * @param base58Address - Solana base58 public key
 * @returns 32-byte hex string with 0x prefix
 */
export function solanaAddressToHyperlane(base58Address: string): string {
  const decoded = bs58.decode(base58Address);
  if (decoded.length !== 32) {
    throw new Error('Invalid Solana address: must be 32 bytes');
  }
  return '0x' + Buffer.from(decoded).toString('hex');
}

/**
 * Convert Hyperlane 32-byte format to EVM address
 *
 * @param bytes32 - 32-byte hex string with 0x prefix
 * @returns EVM address (last 20 bytes)
 */
export function hyperlaneToEvmAddress(bytes32: string): string {
  const cleaned = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error('Invalid Hyperlane address format');
  }
  return '0x' + cleaned.slice(-40);
}

/**
 * Convert Hyperlane 32-byte format to Cosmos bech32 address
 *
 * @param bytes32 - 32-byte hex string with 0x prefix
 * @param prefix - Bech32 prefix (e.g., "dym", "cosmos")
 * @returns Cosmos bech32 address
 */
export function hyperlaneToCosmosAddress(bytes32: string, prefix: string): string {
  const cleaned = bytes32.startsWith('0x') ? bytes32.slice(2) : bytes32;
  if (!/^[0-9a-fA-F]{64}$/.test(cleaned)) {
    throw new Error('Invalid Hyperlane address format');
  }
  const bytes = Buffer.from(cleaned, 'hex');
  let startIndex = 0;
  while (startIndex < bytes.length && bytes[startIndex] === 0) {
    startIndex++;
  }
  const addressBytes = bytes.slice(startIndex);
  return toBech32(prefix, addressBytes);
}

/**
 * Validate EVM address format
 *
 * @param address - Address to validate
 * @returns true if valid EVM address
 */
export function isValidEvmAddress(address: string): boolean {
  const cleaned = address.toLowerCase().replace('0x', '');
  return /^[0-9a-f]{40}$/.test(cleaned);
}

/**
 * Validate Cosmos bech32 address format
 *
 * @param address - Address to validate
 * @returns true if valid bech32 address
 */
export function isValidCosmosAddress(address: string): boolean {
  try {
    const { data } = fromBech32(address);
    return data.length === 20;
  } catch {
    return false;
  }
}

/**
 * Validate Hyperlane 32-byte hex address format
 *
 * @param hex - Hex string to validate
 * @returns true if valid 32-byte hex string
 */
export function isValidHyperlaneAddress(hex: string): boolean {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]{64}$/.test(cleaned);
}
