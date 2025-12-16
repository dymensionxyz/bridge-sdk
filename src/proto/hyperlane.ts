/**
 * Hyperlane Cosmos module protobuf types
 *
 * Provides CosmJS-compatible message types for the Hyperlane warp module.
 * These types can be registered with a CosmJS Registry to enable signing
 * and broadcasting Hyperlane transfers from Hub.
 *
 * @example
 * ```typescript
 * import { Registry, defaultRegistryTypes } from '@cosmjs/proto-signing';
 * import { MsgRemoteTransferEncoder, MSG_REMOTE_TRANSFER_TYPE_URL } from '@dymension/bridge-sdk';
 *
 * const registry = new Registry(defaultRegistryTypes);
 * registry.register(MSG_REMOTE_TRANSFER_TYPE_URL, MsgRemoteTransferEncoder);
 * ```
 */

import protobuf from 'protobufjs';
import { Registry } from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';

/**
 * Type URL for MsgRemoteTransfer
 */
export const MSG_REMOTE_TRANSFER_TYPE_URL = '/hyperlane.warp.v1.MsgRemoteTransfer';

/**
 * HexAddress is a 32-byte identifier used in Hyperlane for:
 * - Token IDs (warp route identifiers)
 * - Recipients (padded to 32 bytes)
 * - Hook IDs (IGP and custom hooks)
 *
 * IMPORTANT: In the proto definition, HexAddress is encoded as a STRING
 * containing "0x" + 64 hex characters (66 chars total), NOT as raw bytes.
 * This matches the Go implementation where ENCODED_HEX_ADDRESS_LENGTH = 66.
 */
export const HEX_ADDRESS_LENGTH = 32;
export const ENCODED_HEX_ADDRESS_LENGTH = 66;

// Build protobuf types at runtime
const root = new protobuf.Root();

const Coin = new protobuf.Type('Coin')
  .add(new protobuf.Field('denom', 1, 'string'))
  .add(new protobuf.Field('amount', 2, 'string'));

/**
 * MsgRemoteTransfer proto definition
 *
 * From hyperlane-cosmos/proto/hyperlane/warp/v1/tx.proto:
 * - sender: cosmos address string
 * - token_id: HexAddress (string with 0x prefix, 66 chars)
 * - destination_domain: uint32 - Hyperlane domain ID of target chain
 * - recipient: HexAddress (string with 0x prefix, 66 chars)
 * - amount: string (cosmos.Int)
 * - custom_hook_id: HexAddress (string with 0x prefix, 66 chars, nullable)
 * - gas_limit: string (cosmos.Int)
 * - max_fee: Coin - maximum fee for IGP payment
 * - custom_hook_metadata: string
 *
 * NOTE: HexAddress fields are STRING type in proto, not bytes!
 * The Go code uses gogoproto.customtype to handle the HexAddress custom type.
 */
const MsgRemoteTransferProto = new protobuf.Type('MsgRemoteTransfer')
  .add(new protobuf.Field('sender', 1, 'string'))
  .add(new protobuf.Field('tokenId', 2, 'string'))
  .add(new protobuf.Field('destinationDomain', 3, 'uint32'))
  .add(new protobuf.Field('recipient', 4, 'string'))
  .add(new protobuf.Field('amount', 5, 'string'))
  .add(new protobuf.Field('customHookId', 6, 'string'))
  .add(new protobuf.Field('gasLimit', 7, 'string'))
  .add(new protobuf.Field('maxFee', 8, 'Coin'))
  .add(new protobuf.Field('customHookMetadata', 9, 'string'));

root.add(Coin);
root.add(MsgRemoteTransferProto);

/**
 * Ensure a hex address has 0x prefix and is 66 chars (32 bytes encoded)
 */
function normalizeHexAddress(hex: string): string {
  if (!hex) return '';
  const withPrefix = hex.startsWith('0x') ? hex : '0x' + hex;
  if (withPrefix.length !== 66) {
    throw new Error(`Invalid HexAddress length: expected 66 chars, got ${withPrefix.length}`);
  }
  return withPrefix;
}

/**
 * MsgRemoteTransfer fields interface
 *
 * HexAddress fields (tokenId, recipient, customHookId) should be 66-char
 * hex strings with 0x prefix.
 */
export interface MsgRemoteTransferValue {
  sender: string;
  tokenId: string;
  destinationDomain: number;
  recipient: string;
  amount: string;
  customHookId?: string;
  gasLimit: string;
  maxFee: { denom: string; amount: string };
  customHookMetadata?: string;
}

/**
 * CosmJS GeneratedType for MsgRemoteTransfer
 *
 * HexAddress fields are encoded as strings with 0x prefix (66 chars).
 * This matches the Go implementation.
 *
 * Register with CosmJS:
 * ```typescript
 * registry.register(MSG_REMOTE_TRANSFER_TYPE_URL, MsgRemoteTransferEncoder);
 * ```
 */
export const MsgRemoteTransferEncoder = {
  encode: (message: MsgRemoteTransferValue) => {
    const converted = {
      ...message,
      tokenId: normalizeHexAddress(message.tokenId),
      recipient: normalizeHexAddress(message.recipient),
      customHookId: message.customHookId ? normalizeHexAddress(message.customHookId) : '',
      customHookMetadata: message.customHookMetadata || '',
    };
    return MsgRemoteTransferProto.encode(MsgRemoteTransferProto.create(converted));
  },
  decode: (bytes: Uint8Array) => {
    return MsgRemoteTransferProto.decode(bytes);
  },
  fromPartial: (obj: Partial<MsgRemoteTransferValue>) => MsgRemoteTransferProto.create(obj),
};

/**
 * Create a CosmJS Registry with Hyperlane types pre-registered
 *
 * @example
 * ```typescript
 * import { createHyperlaneRegistry } from '@dymension/bridge-sdk';
 * import { SigningStargateClient } from '@cosmjs/stargate';
 *
 * const registry = createHyperlaneRegistry();
 * const client = await SigningStargateClient.connectWithSigner(rpc, signer, { registry });
 * ```
 */
export function createHyperlaneRegistry(): Registry {
  const registry = new Registry(defaultRegistryTypes);
  // Cast needed because protobufjs types don't exactly match CosmJS GeneratedType
  registry.register(MSG_REMOTE_TRANSFER_TYPE_URL, MsgRemoteTransferEncoder as never);
  return registry;
}
