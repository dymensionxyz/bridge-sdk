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

/**
 * Convert a Kaspa address to Hyperlane 32-byte hex format
 *
 * Kaspa addresses use bech32m encoding with a 32-byte schnorr public key payload.
 * Format: kaspa:<bech32m data> or kaspatest:<bech32m data>
 *
 * @param kaspaAddress - Kaspa address (e.g., "kaspa:qr0jmjgh2sx88q9...")
 * @returns 32-byte hex string with 0x prefix
 */
export function kaspaAddressToHyperlane(kaspaAddress: string): string {
  const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  const parts = kaspaAddress.split(':');
  if (parts.length !== 2) {
    throw new Error('Invalid Kaspa address format: expected prefix:data');
  }

  const prefix = parts[0];
  if (prefix !== 'kaspa' && prefix !== 'kaspatest') {
    throw new Error(`Invalid Kaspa address prefix: ${prefix}`);
  }

  const data = parts[1];
  // Kaspa bech32m: 8 checksum chars at the end
  const dataWithoutChecksum = data.slice(0, -8);

  // Decode bech32 5-bit values
  const values: number[] = [];
  for (const char of dataWithoutChecksum) {
    const idx = CHARSET.indexOf(char);
    if (idx === -1) {
      throw new Error(`Invalid character in Kaspa address: ${char}`);
    }
    values.push(idx);
  }

  // First value is the version byte, skip it
  // Convert remaining 5-bit groups to 8-bit bytes
  const bytes: number[] = [];
  let acc = 0;
  let bitCount = 0;

  for (let i = 1; i < values.length; i++) {
    acc = (acc << 5) | values[i];
    bitCount += 5;
    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((acc >> bitCount) & 0xff);
    }
  }

  // Discard any remaining bits (padding)
  if (bytes.length !== 32) {
    throw new Error(`Invalid Kaspa address: expected 32-byte pubkey, got ${bytes.length}`);
  }

  return '0x' + bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}
