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
  // TODO: Implement protobuf encoding
  // 1. Create MsgRemoteTransfer from params.transfer
  // 2. Wrap in HookForwardToHL
  // 3. Proto-encode HookForwardToHL
  // 4. Create CompletionHookCall with name and data
  // 5. Proto-encode CompletionHookCall
  // 6. Base64 encode
  // 7. Create final memo JSON
  // TODO: Use HOOK_NAMES.ROLL_TO_HL, _params.eibcFee and _params.transfer in protobuf encoding

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
  // TODO: Implement protobuf encoding
  // Similar to RollApp memo but uses "on_completion" instead of "eibc.dym_on_completion"
  // TODO: Use _params.transfer in protobuf encoding

  // Placeholder until protobuf encoding is implemented
  throw new Error('Not implemented: requires protobuf encoding');
}
