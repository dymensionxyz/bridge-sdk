/**
 * Kaspa deposit payload serialization for Dymension bridge
 *
 * Kaspa has no smart contracts, so we construct a complete Hyperlane message
 * that the user must include in their Kaspa transaction to the escrow address.
 */

import { KASPA, DOMAINS, HUB_TOKEN_IDS } from '../config/constants.js';
import { cosmosAddressToHyperlane, hexToBytes } from '../utils/index.js';
import {
  encodeHLMetadata,
  encodeHookForwardToHL,
  encodeHookForwardToIBC,
  type MsgRemoteTransferFields,
  type MsgTransferFields,
} from '../forward/index.js';

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
  /** Optional: Forward to Hyperlane destination after arriving on Hub */
  forwardToHyperlane?: MsgRemoteTransferFields;
  /** Optional: Forward to IBC destination after arriving on Hub */
  forwardToIbc?: MsgTransferFields;
}

/**
 * Serialize a complete Kaspa deposit payload for bridging to Dymension Hub
 *
 * Creates a complete Hyperlane message containing:
 * - Message header (version, nonce, origin, sender, destination, recipient)
 * - TokenMessage body (recipient, amount, metadata)
 *
 * When forwarding parameters are provided, the metadata will contain
 * the forwarding hook data for automatic routing after Hub arrival.
 *
 * @param params - Deposit parameters
 * @returns Serialized Hyperlane message bytes
 */
export function serializeKaspaDepositPayload(params: KaspaDepositParams): Uint8Array {
  const { hubRecipient, amount, network = 'mainnet', forwardToHyperlane, forwardToIbc } = params;

  if (amount < KASPA.MIN_DEPOSIT_SOMPI) {
    throw new Error(
      `Minimum deposit is ${KASPA.MIN_DEPOSIT_SOMPI} sompi (${Number(KASPA.MIN_DEPOSIT_SOMPI) / Number(KASPA.SOMPI_PER_KAS)} KAS)`
    );
  }

  if (forwardToHyperlane && forwardToIbc) {
    throw new Error('Cannot specify both forwardToHyperlane and forwardToIbc');
  }

  const hubDomain = network === 'mainnet' ? DOMAINS.DYMENSION_MAINNET : DOMAINS.DYMENSION_TESTNET;
  const kaspaDomain = network === 'mainnet' ? DOMAINS.KASPA_MAINNET : DOMAINS.KASPA_TESTNET;

  const recipientH256 = cosmosAddressToHyperlane(hubRecipient);
  const metadata = serializeHlMetadata(forwardToHyperlane, forwardToIbc);
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
 * Serialize HlMetadata with optional forwarding hooks
 *
 * HlMetadata fields:
 * - hook_forward_to_ibc (field 1): IBC forwarding data
 * - kaspa (field 2): Kaspa-specific data
 * - hook_forward_to_hl (field 3): Hyperlane forwarding data
 */
function serializeHlMetadata(
  forwardToHyperlane?: MsgRemoteTransferFields,
  forwardToIbc?: MsgTransferFields
): Uint8Array {
  if (!forwardToHyperlane && !forwardToIbc) {
    return new Uint8Array(0);
  }

  return encodeHLMetadata({
    hookForwardToHl: forwardToHyperlane ? encodeHookForwardToHL(forwardToHyperlane) : undefined,
    hookForwardToIbc: forwardToIbc ? encodeHookForwardToIBC(forwardToIbc) : undefined,
  });
}

/**
 * Get the Kaspa escrow address for deposits
 */
export function getKaspaEscrowAddress(network: 'mainnet' | 'testnet' = 'mainnet'): string {
  return network === 'mainnet' ? KASPA.ESCROW_MAINNET : KASPA.ESCROW_TESTNET;
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
