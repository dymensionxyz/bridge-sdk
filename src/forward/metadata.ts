/**
 * HLMetadata construction for Hyperlane-based forwarding
 */

import type { HLToIBCParams, HLToHLParams } from './types.js';

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
  _params: HLToIBCParams
): Uint8Array {
  // TODO: Implement protobuf encoding
  // 1. Create MsgTransfer from params
  // 2. Wrap in HookForwardToIBC
  // 3. Proto-encode HookForwardToIBC
  // 4. Create HLMetadata with hook_forward_to_ibc field
  // 5. Proto-encode HLMetadata

  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
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
  _params: HLToHLParams
): Uint8Array {
  // TODO: Implement protobuf encoding
  // 1. Create MsgRemoteTransfer from params.transfer
  // 2. Wrap in HookForwardToHL
  // 3. Proto-encode HookForwardToHL
  // 4. Create HLMetadata with hook_forward_to_hl field
  // 5. Proto-encode HLMetadata

  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
}
