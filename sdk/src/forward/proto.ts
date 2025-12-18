/**
 * Protobuf encoding utilities for forward module messages
 *
 * Manually implements encoding for:
 * - CompletionHookCall
 * - HookForwardToHL
 * - HookForwardToIBC
 * - HLMetadata
 */

import protobuf from 'protobufjs';

const { Writer } = protobuf;

/**
 * Encodes a CompletionHookCall message
 *
 * message CompletionHookCall {
 *   string name = 1;
 *   bytes data = 2;
 * }
 */
export function encodeCompletionHookCall(name: string, data: Uint8Array): Uint8Array {
  const writer = Writer.create();

  if (name) {
    writer.uint32(10).string(name); // field 1, wire type 2 (length-delimited)
  }

  if (data && data.length > 0) {
    writer.uint32(18).bytes(data); // field 2, wire type 2 (length-delimited)
  }

  return writer.finish();
}

/**
 * Encodes a MsgRemoteTransfer for HookForwardToHL
 *
 * From hyperlane/warp/v1/tx.proto:
 * message MsgRemoteTransfer {
 *   string token_id = 1;           // hex address
 *   uint32 destination_domain = 2;
 *   string recipient = 3;          // hex address (32 bytes)
 *   string amount = 4;             // string representation of uint256
 *   string custom_hook_id = 5;     // optional hex address
 *   string gas_limit = 6;          // string representation
 *   cosmos.base.v1beta1.Coin max_fee = 7;
 *   string custom_hook_metadata = 8;
 * }
 */
export interface MsgRemoteTransferFields {
  tokenId: string;
  destinationDomain: number;
  recipient: string;
  amount: string;
  maxFee: { denom: string; amount: string };
  gasLimit?: string;
  customHookId?: string;
  customHookMetadata?: string;
}

function encodeCoin(denom: string, amount: string): Uint8Array {
  const writer = Writer.create();
  writer.uint32(10).string(denom);   // field 1: denom
  writer.uint32(18).string(amount);  // field 2: amount
  return writer.finish();
}

function encodeMsgRemoteTransfer(msg: MsgRemoteTransferFields): Uint8Array {
  const writer = Writer.create();

  writer.uint32(10).string(msg.tokenId);              // field 1
  writer.uint32(16).uint32(msg.destinationDomain);    // field 2
  writer.uint32(26).string(msg.recipient);            // field 3
  writer.uint32(34).string(msg.amount);               // field 4

  if (msg.customHookId) {
    writer.uint32(42).string(msg.customHookId);       // field 5
  }

  writer.uint32(50).string(msg.gasLimit || '0');      // field 6

  const maxFeeBz = encodeCoin(msg.maxFee.denom, msg.maxFee.amount);
  writer.uint32(58).bytes(maxFeeBz);                  // field 7

  if (msg.customHookMetadata) {
    writer.uint32(66).string(msg.customHookMetadata); // field 8
  }

  return writer.finish();
}

/**
 * Encodes a HookForwardToHL message
 *
 * message HookForwardToHL {
 *   hyperlane.warp.v1.MsgRemoteTransfer hyperlane_transfer = 1;
 * }
 */
export function encodeHookForwardToHL(transfer: MsgRemoteTransferFields): Uint8Array {
  const transferBz = encodeMsgRemoteTransfer(transfer);
  const writer = Writer.create();
  writer.uint32(10).bytes(transferBz); // field 1
  return writer.finish();
}

/**
 * Encodes an IBC MsgTransfer for HookForwardToIBC
 *
 * message MsgTransfer {
 *   string source_port = 1;
 *   string source_channel = 2;
 *   cosmos.base.v1beta1.Coin token = 3;
 *   string sender = 4;
 *   string receiver = 5;
 *   ibc.core.client.v1.Height timeout_height = 6;
 *   uint64 timeout_timestamp = 7;
 *   string memo = 8;
 * }
 */
export interface MsgTransferFields {
  sourcePort: string;
  sourceChannel: string;
  token: { denom: string; amount: string };
  sender: string;
  receiver: string;
  timeoutHeight: { revisionNumber: bigint; revisionHeight: bigint };
  timeoutTimestamp: bigint;
  memo?: string;
}

function encodeHeight(height: { revisionNumber: bigint; revisionHeight: bigint }): Uint8Array {
  const writer = Writer.create();
  writer.uint32(8).uint64(Number(height.revisionNumber));   // field 1
  writer.uint32(16).uint64(Number(height.revisionHeight));  // field 2
  return writer.finish();
}

function encodeMsgTransfer(msg: MsgTransferFields): Uint8Array {
  const writer = Writer.create();

  writer.uint32(10).string(msg.sourcePort);           // field 1
  writer.uint32(18).string(msg.sourceChannel);        // field 2

  const tokenBz = encodeCoin(msg.token.denom, msg.token.amount);
  writer.uint32(26).bytes(tokenBz);                   // field 3

  writer.uint32(34).string(msg.sender);               // field 4
  writer.uint32(42).string(msg.receiver);             // field 5

  const heightBz = encodeHeight(msg.timeoutHeight);
  writer.uint32(50).bytes(heightBz);                  // field 6

  writer.uint32(56).uint64(Number(msg.timeoutTimestamp));     // field 7

  if (msg.memo) {
    writer.uint32(66).string(msg.memo);               // field 8
  }

  return writer.finish();
}

/**
 * Encodes a HookForwardToIBC message
 *
 * message HookForwardToIBC {
 *   ibc.applications.transfer.v1.MsgTransfer transfer = 1;
 * }
 */
export function encodeHookForwardToIBC(transfer: MsgTransferFields): Uint8Array {
  const transferBz = encodeMsgTransfer(transfer);
  const writer = Writer.create();
  writer.uint32(10).bytes(transferBz); // field 1
  return writer.finish();
}

/**
 * Encodes HLMetadata
 *
 * message HLMetadata {
 *   bytes hook_forward_to_ibc = 1;
 *   bytes kaspa = 2;
 *   bytes hook_forward_to_hl = 3;
 * }
 */
export interface HLMetadataFields {
  hookForwardToIbc?: Uint8Array;
  kaspa?: Uint8Array;
  hookForwardToHl?: Uint8Array;
}

export function encodeHLMetadata(metadata: HLMetadataFields): Uint8Array {
  const writer = Writer.create();

  if (metadata.hookForwardToIbc && metadata.hookForwardToIbc.length > 0) {
    writer.uint32(10).bytes(metadata.hookForwardToIbc);  // field 1
  }

  if (metadata.kaspa && metadata.kaspa.length > 0) {
    writer.uint32(18).bytes(metadata.kaspa);             // field 2
  }

  if (metadata.hookForwardToHl && metadata.hookForwardToHl.length > 0) {
    writer.uint32(26).bytes(metadata.hookForwardToHl);   // field 3
  }

  return writer.finish();
}
