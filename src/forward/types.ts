/**
 * Types for forward module memo/metadata construction
 */

/**
 * Hook names for completion hooks
 */
export const HOOK_NAMES = {
  /** Forward to Hyperlane from RollApp */
  ROLL_TO_HL: 'dym-fwd-roll-hl',
  /** Forward to IBC from RollApp */
  ROLL_TO_IBC: 'dym-fwd-roll-ibc',
} as const;

/**
 * MsgRemoteTransfer fields for Hyperlane forwarding
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

/**
 * Parameters for RollApp -> Hyperlane forwarding memo
 */
export interface RollAppToHyperlaneParams {
  /** EIBC fee for fulfillers (in base denom units) */
  eibcFee: string;
  /** Hyperlane transfer parameters */
  transfer: MsgRemoteTransferFields;
}

/**
 * Parameters for IBC -> Hyperlane forwarding memo
 */
export interface IBCToHyperlaneParams {
  /** Hyperlane transfer parameters */
  transfer: MsgRemoteTransferFields;
}

/**
 * Parameters for Hyperlane -> IBC forwarding metadata
 */
export interface HLToIBCParams {
  sourceChannel: string;
  receiver: string;
  timeoutTimestamp: bigint;
  memo?: string;
}

/**
 * Parameters for Hyperlane -> Hyperlane forwarding metadata
 */
export interface HLToHLParams {
  /** Hyperlane transfer parameters */
  transfer: MsgRemoteTransferFields;
}
