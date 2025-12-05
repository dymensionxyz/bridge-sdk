/**
 * Kaspa-specific utilities
 *
 * Kaspa has no smart contracts, so we can only construct the payload
 * that the user must include in their Kaspa transaction.
 */

import { KASPA } from '../config/constants.js';
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
 * Serialize a Kaspa deposit payload for bridging to Hub
 *
 * The payload is the Hyperlane message body that will be included
 * in the Kaspa transaction sent to the escrow address.
 *
 * @param params - Deposit parameters
 * @returns Serialized payload bytes
 */
export function serializeKaspaDepositPayload(params: KaspaDepositParams): Uint8Array {
  const { hubRecipient, amount } = params;

  // Validate minimum deposit
  if (amount < KASPA.MIN_DEPOSIT_SOMPI) {
    throw new Error(
      `Minimum deposit is ${KASPA.MIN_DEPOSIT_SOMPI} sompi (${Number(KASPA.MIN_DEPOSIT_SOMPI) / Number(KASPA.SOMPI_PER_KAS)} KAS)`
    );
  }

  const recipientHex = cosmosAddressToHyperlane(hubRecipient);

  // Construct the warp payload body (64 bytes)
  // Format: 12 bytes padding + 20 bytes recipient + 32 bytes amount
  const bodyBytes = serializeWarpPayloadBody(recipientHex, amount);

  // Construct full Hyperlane message
  // TODO: Full message construction with proper header
  // Placeholder - needs proper Hyperlane message serialization
  return bodyBytes;
}

/**
 * Serialize the warp payload body
 */
function serializeWarpPayloadBody(recipientHex: string, amount: bigint): Uint8Array {
  // 64 bytes total: 12 padding + 20 recipient + 32 amount
  const result = new Uint8Array(64);

  // First 12 bytes: zero padding
  result.fill(0, 0, 12);

  // Next 20 bytes: recipient (last 20 bytes of 32-byte hex)
  const recipientBytes = hexToBytes(recipientHex.slice(-40)); // Last 40 hex chars = 20 bytes
  result.set(recipientBytes, 12);

  // Last 32 bytes: amount as big-endian uint256
  const amountHex = amount.toString(16).padStart(64, '0');
  const amountBytes = hexToBytes(amountHex);
  result.set(amountBytes, 32);

  return result;
}

/**
 * Get the Kaspa escrow address for deposits
 */
export function getKaspaEscrowAddress(network: 'mainnet' | 'testnet' = 'mainnet'): string {
  return network === 'mainnet' ? KASPA.ESCROW_MAINNET : KASPA.ESCROW_TESTNET;
}

/**
 * Helper: convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
