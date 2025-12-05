/**
 * Memo construction for IBC-based forwarding
 */

import type { RollAppToHyperlaneParams, IBCToHyperlaneParams } from './types.js';

/**
 * Creates EIBC memo for RollApp -> Hub -> Hyperlane forwarding
 *
 * The memo structure is:
 * {
 *   "eibc": {
 *     "fee": "<eibc_fee>",
 *     "dym_on_completion": "<base64(proto(CompletionHookCall))>"
 *   }
 * }
 *
 * @param params - Forwarding parameters
 * @returns JSON memo string to include in IBC MsgTransfer
 */
export function createRollAppToHyperlaneMemo(
  _params: RollAppToHyperlaneParams
): string {
  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
}

/**
 * Creates IBC memo for external IBC chain -> Hub -> Hyperlane forwarding
 * (For non-RollApp IBC sources like Osmosis, Cosmos Hub)
 *
 * The memo structure is:
 * {
 *   "on_completion": "<base64(proto(CompletionHookCall))>"
 * }
 *
 * @param params - Forwarding parameters
 * @returns JSON memo string to include in IBC MsgTransfer
 */
export function createIBCToHyperlaneMemo(
  _params: IBCToHyperlaneParams
): string {
  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
}
