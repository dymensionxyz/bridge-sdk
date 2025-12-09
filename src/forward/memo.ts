/**
 * Memo construction for IBC-based forwarding
 */

import { toBase64 } from '@cosmjs/encoding';
import type { RollAppToHyperlaneParams, IBCToHyperlaneParams } from './types.js';
import { HOOK_NAMES } from './types.js';
import {
  encodeCompletionHookCall,
  encodeHookForwardToHL,
} from './proto.js';

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
 * The CompletionHookCall contains:
 * - name: hook name (HOOK_NAMES.ROLL_TO_HL)
 * - data: proto-encoded HookForwardToHL
 *
 * @param params - Forwarding parameters
 * @returns JSON memo string to include in IBC MsgTransfer
 */
export function createRollAppToHyperlaneMemo(
  params: RollAppToHyperlaneParams
): string {
  const hookForwardToHL = encodeHookForwardToHL(params.transfer);

  const completionHookCall = encodeCompletionHookCall(
    HOOK_NAMES.ROLL_TO_HL,
    hookForwardToHL
  );

  const completionHookBase64 = toBase64(completionHookCall);

  const memo = {
    eibc: {
      fee: params.eibcFee,
      dym_on_completion: completionHookBase64,
    },
  };

  return JSON.stringify(memo);
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
  params: IBCToHyperlaneParams
): string {
  const hookForwardToHL = encodeHookForwardToHL(params.transfer);

  const completionHookCall = encodeCompletionHookCall(
    HOOK_NAMES.ROLL_TO_HL,
    hookForwardToHL
  );

  const completionHookBase64 = toBase64(completionHookCall);

  const memo = {
    on_completion: completionHookBase64,
  };

  return JSON.stringify(memo);
}
