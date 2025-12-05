/**
 * HLMetadata construction for Hyperlane-based forwarding
 */

import type { HLToIBCParams, HLToHLParams } from './types.js';
import {
  encodeHookForwardToIBC,
  encodeHookForwardToHL,
  encodeHLMetadata,
  type MsgTransferFields,
} from './proto.js';

/**
 * Creates HLMetadata for Hyperlane -> Hub -> IBC forwarding
 *
 * Used when bridging from an external chain (Ethereum, Kaspa) to an IBC chain
 * (Osmosis, Cosmos Hub) via Dymension Hub.
 *
 * @param params - IBC transfer parameters
 * @returns Serialized HLMetadata bytes
 */
export function createHLMetadataForIBC(
  params: HLToIBCParams
): Uint8Array {
  const msgTransfer: MsgTransferFields = {
    sourcePort: 'transfer',
    sourceChannel: params.sourceChannel,
    token: {
      denom: params.token.denom,
      amount: params.token.amount,
    },
    sender: params.sender,
    receiver: params.receiver,
    timeoutHeight: params.timeoutHeight || {
      revisionNumber: BigInt(0),
      revisionHeight: BigInt(0),
    },
    timeoutTimestamp: params.timeoutTimestamp,
    memo: params.memo,
  };

  const hookForwardToIBC = encodeHookForwardToIBC(msgTransfer);

  const hlMetadata = encodeHLMetadata({
    hookForwardToIbc: hookForwardToIBC,
  });

  return hlMetadata;
}

/**
 * Creates HLMetadata for Hyperlane -> Hub -> Hyperlane forwarding
 *
 * Used for cross-Hyperlane routing through Hub (e.g., Ethereum -> Base via Hub)
 *
 * @param params - Hyperlane transfer parameters
 * @returns Serialized HLMetadata bytes
 */
export function createHLMetadataForHL(
  params: HLToHLParams
): Uint8Array {
  const hookForwardToHL = encodeHookForwardToHL(params.transfer);

  const hlMetadata = encodeHLMetadata({
    hookForwardToHl: hookForwardToHL,
  });

  return hlMetadata;
}
