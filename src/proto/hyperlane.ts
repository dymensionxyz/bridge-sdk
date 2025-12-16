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
 * In the proto definition, these are encoded as bytes (not strings).
 */
export const HEX_ADDRESS_LENGTH = 32;

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
 * - token_id: HexAddress (32 bytes) - the warp token ID
 * - destination_domain: uint32 - Hyperlane domain ID of target chain
 * - recipient: HexAddress (32 bytes) - recipient address padded to 32 bytes
 * - amount: string (cosmos.Int)
 * - custom_hook_id: HexAddress (32 bytes, nullable) - post-dispatch hook
 * - gas_limit: string (cosmos.Int)
 * - max_fee: Coin - maximum fee for IGP payment
 * - custom_hook_metadata: bytes
 */
const MsgRemoteTransferProto = new protobuf.Type('MsgRemoteTransfer')
  .add(new protobuf.Field('sender', 1, 'string'))
  .add(new protobuf.Field('tokenId', 2, 'bytes'))
  .add(new protobuf.Field('destinationDomain', 3, 'uint32'))
  .add(new protobuf.Field('recipient', 4, 'bytes'))
  .add(new protobuf.Field('amount', 5, 'string'))
  .add(new protobuf.Field('customHookId', 6, 'bytes'))
  .add(new protobuf.Field('gasLimit', 7, 'string'))
  .add(new protobuf.Field('maxFee', 8, 'Coin'))
  .add(new protobuf.Field('customHookMetadata', 9, 'bytes'));

root.add(Coin);
root.add(MsgRemoteTransferProto);

/**
 * Convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * MsgRemoteTransfer fields interface
 *
 * The SDK uses camelCase (tokenId) but the proto uses snake_case (token_id).
 * CosmJS handles this conversion automatically.
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
 * This handles the conversion of hex string fields to bytes during encoding.
 * HexAddress fields (tokenId, recipient, customHookId) must be encoded as
 * bytes in the protobuf, not strings.
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
      tokenId: typeof message.tokenId === 'string' ? hexToBytes(message.tokenId) : message.tokenId,
      recipient: typeof message.recipient === 'string' ? hexToBytes(message.recipient) : message.recipient,
      customHookId:
        typeof message.customHookId === 'string' && message.customHookId
          ? hexToBytes(message.customHookId)
          : new Uint8Array(0),
      customHookMetadata:
        typeof message.customHookMetadata === 'string'
          ? new TextEncoder().encode(message.customHookMetadata)
          : message.customHookMetadata || new Uint8Array(0),
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
