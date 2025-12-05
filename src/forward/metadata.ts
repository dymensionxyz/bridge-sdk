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
  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
}
