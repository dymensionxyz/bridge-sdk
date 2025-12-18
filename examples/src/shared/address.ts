/**
 * Address conversion utilities
 *
 * Simple address converters for Hyperlane 32-byte format.
 */

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
 * Convert a Solana address to Hyperlane 32-byte hex format
 *
 * @param base58Address - Solana base58 public key
 * @returns 32-byte hex string with 0x prefix
 */
export function solanaAddressToHyperlane(base58Address: string): string {
  // Decode base58 to bytes
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = 0n;
  for (const char of base58Address) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 character: ${char}`);
    result = result * 58n + BigInt(idx);
  }

  // Convert bigint to 32 bytes
  const bytes = new Uint8Array(32);
  let i = 31;
  while (result > 0n && i >= 0) {
    bytes[i--] = Number(result & 0xffn);
    result >>= 8n;
  }

  return '0x' + Buffer.from(bytes).toString('hex');
}

/**
 * Convert a Kaspa address to Hyperlane 32-byte hex format
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
