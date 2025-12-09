/**
 * Address conversion utilities for Hyperlane
 *
 * Hyperlane uses 32-byte addresses for all chains.
 * These utilities convert chain-specific addresses to the 32-byte format.
 */

import { fromBech32 } from '@cosmjs/encoding';
import { PublicKey } from '@solana/web3.js';

/**
 * Convert a Cosmos bech32 address to Hyperlane 32-byte hex format
 *
 * @param bech32Address - Cosmos address (e.g., "dym1...")
 * @returns 32-byte hex string with 0x prefix
 */
export function cosmosAddressToHyperlane(bech32Address: string): string {
  const { data } = fromBech32(bech32Address);

  // Pad to 32 bytes with leading zeros
  const padded = new Uint8Array(32);
  padded.set(data, 32 - data.length);

  return '0x' + Buffer.from(padded).toString('hex');
}

/**
 * Convert an EVM address to Hyperlane 32-byte hex format
 *
 * @param address - EVM address (e.g., "0x742d35Cc...")
 * @returns 32-byte hex string with 0x prefix
 */
export function evmAddressToHyperlane(address: string): string {
  const cleaned = address.toLowerCase().replace('0x', '');

  // Pad to 64 hex chars (32 bytes) with leading zeros
  return '0x' + cleaned.padStart(64, '0');
}

/**
 * Convert a Solana address to Hyperlane 32-byte hex format
 *
 * @param _address - Solana base58 public key
 * @returns 32-byte hex string with 0x prefix
 */
export function solanaAddressToHyperlane(address: string): string {
  try {
    const pubkey = new PublicKey(address);
    return '0x' + Buffer.from(pubkey.toBytes()).toString('hex');
  } catch {
    throw new Error(`Invalid Solana address: ${address}`);
  }
}

/**
 * Validate that a hex string is a valid 32-byte Hyperlane address
 */
export function isValidHyperlaneAddress(hex: string): boolean {
  const cleaned = hex.startsWith('0x') ? hex.slice(2) : hex;
  return /^[0-9a-fA-F]{64}$/.test(cleaned);
}
