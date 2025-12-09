/**
 * Kaspa deposit payload serialization for Dymension bridge
 *
 * Kaspa has no smart contracts, so we construct a complete Hyperlane message
 * that the user must include in their Kaspa transaction to the escrow address.
 */

import { KASPA, DOMAINS, HUB_TOKEN_IDS } from '../config/constants.js';
import { cosmosAddressToHyperlane } from '../utils/address.js';

/**
 * Parameters for Kaspa deposit payload
 */
export interface KaspaDepositParams {
  /** Hub recipient address (bech32 dym1... format) */
  hubRecipient: string;
  /** Amount in sompi (1 KAS = 100,000,000 sompi) */
  amount: bigint;
  /** Network selection */
  network?: 'mainnet' | 'testnet';
}

/**
 * Serialize a complete Kaspa deposit payload for bridging to Dymension Hub
 *
 * Creates a complete Hyperlane message containing:
 * - Message header (version, nonce, origin, sender, destination, recipient)
 * - TokenMessage body (recipient, amount, metadata)
 *
 * @param params - Deposit parameters
 * @returns Serialized Hyperlane message bytes
 */
export function serializeKaspaDepositPayload(params: KaspaDepositParams): Uint8Array {
  const { hubRecipient, amount, network = 'mainnet' } = params;

  if (amount < KASPA.MIN_DEPOSIT_SOMPI) {
    throw new Error(
      `Minimum deposit is ${KASPA.MIN_DEPOSIT_SOMPI} sompi (${Number(KASPA.MIN_DEPOSIT_SOMPI) / Number(KASPA.SOMPI_PER_KAS)} KAS)`
    );
  }

  const hubDomain = network === 'mainnet' ? DOMAINS.DYMENSION_MAINNET : DOMAINS.DYMENSION_TESTNET;
  const kaspaDomain = network === 'mainnet' ? DOMAINS.KASPA_MAINNET : DOMAINS.KASPA_TESTNET;

  const recipientH256 = cosmosAddressToHyperlane(hubRecipient);
  const metadata = serializeEmptyHlMetadata();
  const tokenMessageBody = serializeTokenMessage(recipientH256, amount, metadata);

  return serializeHyperlaneMessage({
    version: 3,
    nonce: 0,
    origin: kaspaDomain,
    sender: '0x' + '0'.repeat(64),
    destination: hubDomain,
    recipient: HUB_TOKEN_IDS.KAS,
    body: tokenMessageBody,
  });
}

/**
 * Serialize a TokenMessage (Hyperlane warp route format)
 *
 * Format:
 * - 32 bytes: recipient (H256)
 * - 32 bytes: amount (U256, big-endian)
 * - N bytes: metadata (protobuf-encoded HlMetadata)
 */
function serializeTokenMessage(
  recipient: string,
  amount: bigint,
  metadata: Uint8Array
): Uint8Array {
  const recipientBytes = hexToBytes(recipient);
  const amountBytes = u256ToBigEndian(amount);

  const result = new Uint8Array(64 + metadata.length);
  result.set(recipientBytes, 0);
  result.set(amountBytes, 32);
  result.set(metadata, 64);

  return result;
}

/**
 * Serialize a Hyperlane message
 *
 * Format (77 + body.length bytes):
 * - 1 byte: version
 * - 4 bytes: nonce (big-endian u32)
 * - 4 bytes: origin domain (big-endian u32)
 * - 32 bytes: sender (H256)
 * - 4 bytes: destination domain (big-endian u32)
 * - 32 bytes: recipient (H256)
 * - N bytes: body
 */
function serializeHyperlaneMessage(message: {
  version: number;
  nonce: number;
  origin: number;
  sender: string;
  destination: number;
  recipient: string;
  body: Uint8Array;
}): Uint8Array {
  const result = new Uint8Array(77 + message.body.length);
  let offset = 0;

  result[offset++] = message.version;

  const nonceBytes = u32ToBigEndian(message.nonce);
  result.set(nonceBytes, offset);
  offset += 4;

  const originBytes = u32ToBigEndian(message.origin);
  result.set(originBytes, offset);
  offset += 4;

  const senderBytes = hexToBytes(message.sender);
  result.set(senderBytes, offset);
  offset += 32;

  const destinationBytes = u32ToBigEndian(message.destination);
  result.set(destinationBytes, offset);
  offset += 4;

  const recipientBytes = hexToBytes(message.recipient);
  result.set(recipientBytes, offset);
  offset += 32;

  result.set(message.body, offset);

  return result;
}

/**
 * Serialize an empty HlMetadata protobuf message
 *
 * HlMetadata has three fields (all repeated bytes):
 * - kaspa (field 1)
 * - hook_forward_to_hl (field 2)
 * - hook_forward_to_ibc (field 3)
 *
 * Empty message = 0 bytes (all fields are optional/repeated and empty)
 */
function serializeEmptyHlMetadata(): Uint8Array {
  return new Uint8Array(0);
}

/**
 * Get the Kaspa escrow address for deposits
 */
export function getKaspaEscrowAddress(network: 'mainnet' | 'testnet' = 'mainnet'): string {
  return network === 'mainnet' ? KASPA.ESCROW_MAINNET : KASPA.ESCROW_TESTNET;
}

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Convert bigint to 32-byte big-endian representation (U256)
 */
function u256ToBigEndian(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, '0');
  return hexToBytes(hex);
}

/**
 * Convert number to 4-byte big-endian representation (u32)
 */
function u32ToBigEndian(value: number): Uint8Array {
  const result = new Uint8Array(4);
  result[0] = (value >> 24) & 0xff;
  result[1] = (value >> 16) & 0xff;
  result[2] = (value >> 8) & 0xff;
  result[3] = value & 0xff;
  return result;
}
