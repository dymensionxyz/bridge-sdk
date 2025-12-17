/**
 * Forwarding fee calculations for two-hop transfers through the Hub
 *
 * When a transfer goes through the Hub (e.g., Ethereum -> Hub -> Solana),
 * the SDK must correctly calculate fees for both hops to ensure:
 * 1. Hop 1 delivers enough tokens to the Hub
 * 2. Hop 2 has sufficient budget for IGP + bridging fee + amount to forward
 *
 * The key constraint from x/forward is:
 *   maxFee + amount <= budget
 * Where budget is what arrives at Hub after hop 1 fees
 */

import { calculateBridgingFee, multiplyByRate } from './bridging.js';
import { getHubDenom, getIgpHookForToken, hasIgpHook, type TokenSymbol } from '../config/tokens.js';

/**
 * Route types for forwarding transfers
 */
export type ForwardingRouteType =
  | 'hl-hub-hl' // Hyperlane -> Hub -> Hyperlane
  | 'hl-hub-ibc' // Hyperlane -> Hub -> IBC
  | 'ibc-hub-hl' // IBC -> Hub -> Hyperlane
  | 'rollapp-hub-hl' // RollApp (EIBC) -> Hub -> Hyperlane
  | 'rollapp-hub-ibc'; // RollApp (EIBC) -> Hub -> IBC

/**
 * Fee breakdown for hop 1 (source -> Hub)
 */
export interface Hop1Fees {
  /** IGP fee paid on source chain (separate from transfer, in source chain native token) */
  igpFee: bigint;
  /** Inbound bridging fee (deducted from transfer amount) */
  inboundBridgingFee: bigint;
  /** EIBC fee if using EIBC (deducted from transfer amount) */
  eibcFee?: bigint;
  /** Delayedack bridging fee for RollApp transfers */
  delayedAckBridgingFee?: bigint;
}

/**
 * Fee breakdown for hop 2 (Hub -> destination)
 */
export interface Hop2Fees {
  /** IGP fee for destination chain (passed as maxFee, in token's Hub denom) */
  igpFee: bigint;
  /** Outbound bridging fee (deducted from forward amount during dispatch) */
  outboundBridgingFee: bigint;
  /** IGP hook ID for the token being transferred (32-byte hex) */
  customHookId: string;
  /** Denom for maxFee payment (token's Hub denom) */
  maxFeeDenom: string;
}

/**
 * Complete forwarding calculation result
 */
export interface ForwardingCalculation {
  /** Original amount user wants to send */
  inputAmount: bigint;

  /** Fees for hop 1 */
  hop1Fees: Hop1Fees;

  /** Amount that arrives at Hub (budget for hop 2) */
  hubBudget: bigint;

  /** Fees for hop 2 */
  hop2Fees: Hop2Fees;

  /** Amount to specify in forwarding metadata (what gets sent from Hub) */
  forwardAmount: bigint;

  /** maxFee to specify in forwarding metadata (IGP for hop 2) */
  maxFee: bigint;

  /** Final amount recipient receives after all fees */
  recipientReceives: bigint;

  /** Total fees across both hops (excluding IGP paid separately on source) */
  totalFeesDeductedFromTransfer: bigint;
}

/**
 * Parameters for calculating forwarding fees
 */
export interface ForwardingParams {
  /** Amount user wants to send */
  amount: bigint;

  /** Route type */
  routeType: ForwardingRouteType;

  /** Token being transferred (determines IGP hook and maxFee denom) */
  token: TokenSymbol;

  /** Hop 1: Inbound bridging fee rate (decimal, e.g., 0.001 for 0.1%) */
  hop1InboundBridgingFeeRate?: number;

  /** Hop 1: IGP fee for source -> Hub (in source chain native token) */
  hop1IgpFee?: bigint;

  /** Hop 1: EIBC fee rate as percentage (e.g., 0.5 for 0.5%) - only for rollapp routes */
  eibcFeePercent?: number;

  /** Hop 1: Delayedack bridging fee rate (decimal) - only for rollapp routes */
  delayedAckBridgingFeeRate?: number;

  /** Hop 2: IGP fee for Hub -> destination (in the token's Hub denom) */
  hop2IgpFee: bigint;

  /** Hop 2: Outbound bridging fee rate (decimal, e.g., 0.001 for 0.1%) */
  hop2OutboundBridgingFeeRate: number;
}

/**
 * Calculate fees and amounts for a forwarding (two-hop) transfer
 *
 * This function ensures the SDK correctly accounts for all fees across both hops,
 * preventing scenarios where hop 2 tries to forward more tokens than available.
 *
 * @example
 * ```typescript
 * const provider = new FeeProvider({ network: 'mainnet' });
 *
 * // Get dynamic fee rates
 * const hop2IgpFee = await provider.quoteIgpPayment({
 *   destinationDomain: DOMAINS.ETHEREUM,
 *   gasLimit: 150000,
 *   token: 'DYM',
 * });
 * const hop2BridgingRate = await provider.getBridgingFeeRate(tokenId, 'outbound');
 *
 * // Calculate forwarding
 * const calc = calculateForwardingFees({
 *   amount: 100n * 10n ** 18n, // 100 tokens
 *   routeType: 'hl-hub-hl',
 *   token: 'DYM',
 *   hop2IgpFee,
 *   hop2OutboundBridgingFeeRate: hop2BridgingRate,
 * });
 *
 * // Use calc.forwardAmount, calc.maxFee, and calc.hop2Fees.customHookId in forwarding metadata
 * ```
 */
export function calculateForwardingFees(params: ForwardingParams): ForwardingCalculation {
  const {
    amount,
    routeType,
    token,
    hop1InboundBridgingFeeRate = 0,
    hop1IgpFee = 0n,
    eibcFeePercent = 0,
    delayedAckBridgingFeeRate = 0,
    hop2IgpFee,
    hop2OutboundBridgingFeeRate,
  } = params;

  // Get IGP hook and denom for the token
  // For exempt routes (hl-hub-ibc, rollapp-hub-ibc), no IGP is needed
  const isExemptRoute = routeType.endsWith('-ibc');
  const customHookId = isExemptRoute || !hasIgpHook(token) ? '' : getIgpHookForToken(token);
  const maxFeeDenom = isExemptRoute ? 'adym' : getHubDenom(token);

  // Calculate hop 1 fees
  const hop1Fees: Hop1Fees = {
    igpFee: hop1IgpFee,
    inboundBridgingFee: 0n,
    eibcFee: undefined,
    delayedAckBridgingFee: undefined,
  };

  let hubBudget = amount;

  // Deduct inbound bridging fee (for Hyperlane -> Hub)
  if (routeType.startsWith('hl-')) {
    hop1Fees.inboundBridgingFee = calculateBridgingFee(amount, hop1InboundBridgingFeeRate);
    hubBudget -= hop1Fees.inboundBridgingFee;
  }

  // Deduct EIBC and delayedack fees (for RollApp -> Hub)
  if (routeType.startsWith('rollapp-')) {
    if (eibcFeePercent > 0) {
      hop1Fees.eibcFee = multiplyByRate(amount, eibcFeePercent / 100);
      hubBudget -= hop1Fees.eibcFee;
    }
    if (delayedAckBridgingFeeRate > 0) {
      hop1Fees.delayedAckBridgingFee = multiplyByRate(amount, delayedAckBridgingFeeRate);
      hubBudget -= hop1Fees.delayedAckBridgingFee;
    }
  }

  // Note: IBC -> Hub has no inbound fee
  // Note: HL -> Hub inbound bridging fee is assumed to be 0 (not currently charged)

  // Calculate hop 2 fees
  // Key insight: For Hyperlane outbound (Hub -> External), BOTH IGP and bridging fee
  // are charged from maxFee. The recipient receives the FULL forwardAmount.
  // Constraint: maxFee + forwardAmount <= hubBudget

  // Calculate outbound bridging fee based on what we want to forward
  // We need to solve: maxFee + forwardAmount = hubBudget
  // where maxFee = igpFee + bridgingFee(forwardAmount)
  // So: igpFee + bridgingFee(forwardAmount) + forwardAmount = hubBudget
  // bridgingFee = forwardAmount * rate
  // igpFee + forwardAmount * rate + forwardAmount = hubBudget
  // forwardAmount * (1 + rate) = hubBudget - igpFee
  // forwardAmount = (hubBudget - igpFee) / (1 + rate)

  const budgetAfterIgp = hubBudget - hop2IgpFee;

  if (budgetAfterIgp <= 0n) {
    throw new Error(
      `Insufficient budget for forwarding: hubBudget=${hubBudget}, hop2IgpFee=${hop2IgpFee}. ` +
        `Need at least ${hop2IgpFee + 1n} to cover IGP and send any tokens.`
    );
  }

  // Calculate forwardAmount such that forwardAmount + bridgingFee(forwardAmount) = budgetAfterIgp
  // forwardAmount = budgetAfterIgp / (1 + rate)
  const ratePrecision = 1_000_000n;
  const rateScaled = BigInt(Math.floor(hop2OutboundBridgingFeeRate * Number(ratePrecision)));
  const forwardAmount = (budgetAfterIgp * ratePrecision) / (ratePrecision + rateScaled);

  // Calculate the actual bridging fee based on forwardAmount
  const outboundBridgingFee = calculateBridgingFee(forwardAmount, hop2OutboundBridgingFeeRate);

  // maxFee = IGP + bridging fee (both charged from maxFee, not from transfer amount)
  const maxFee = hop2IgpFee + outboundBridgingFee;

  // Recipient receives the FULL forwardAmount (no deduction)
  const recipientReceives = forwardAmount;

  const hop2Fees: Hop2Fees = {
    igpFee: hop2IgpFee,
    outboundBridgingFee,
    customHookId,
    maxFeeDenom,
  };

  // Calculate total fees deducted from the sender's perspective
  // Hop 1: EIBC and delayedAck fees are deducted from transfer amount (for IBC inbound)
  // Hop 1: Inbound bridging fee (currently 0 for HL->Hub)
  // Hop 2: IGP + bridging fee come from maxFee (deducted from hubBudget)
  let totalFeesDeductedFromTransfer = hop1Fees.inboundBridgingFee;
  if (hop1Fees.eibcFee) {
    totalFeesDeductedFromTransfer += hop1Fees.eibcFee;
  }
  if (hop1Fees.delayedAckBridgingFee) {
    totalFeesDeductedFromTransfer += hop1Fees.delayedAckBridgingFee;
  }
  // Hop 2: maxFee (IGP + bridging) is deducted from hubBudget
  totalFeesDeductedFromTransfer += maxFee;

  return {
    inputAmount: amount,
    hop1Fees,
    hubBudget,
    hop2Fees,
    forwardAmount,
    maxFee,
    recipientReceives,
    totalFeesDeductedFromTransfer,
  };
}

/**
 * Precision for bigint decimal arithmetic (18 decimal places)
 */
const PRECISION = 10n ** 18n;

/**
 * Convert a decimal rate to bigint with PRECISION decimal places
 */
function rateToBigInt(rate: number): bigint {
  return BigInt(Math.floor(rate * Number(PRECISION)));
}

/**
 * Calculate the minimum send amount needed to ensure recipient receives desired amount
 *
 * This is the inverse of calculateForwardingFees - given a desired recipient amount,
 * calculate how much the user needs to send.
 *
 * Uses iterative refinement to handle rounding in fee calculations.
 *
 * @param desiredRecipientAmount - Amount the recipient should receive after all fees
 * @param params - Fee parameters (same as calculateForwardingFees but without amount)
 * @returns The amount the user needs to send
 */
export function calculateForwardingSendAmount(
  desiredRecipientAmount: bigint,
  params: Omit<ForwardingParams, 'amount'>
): bigint {
  const {
    routeType,
    hop1InboundBridgingFeeRate = 0,
    eibcFeePercent = 0,
    delayedAckBridgingFeeRate = 0,
    hop2IgpFee,
    hop2OutboundBridgingFeeRate,
  } = params;

  // Work backwards from recipient amount
  // New model: recipientReceives = forwardAmount (no outbound deduction)
  // So forwardAmount = desiredRecipientAmount
  const forwardAmount = desiredRecipientAmount;

  // Calculate bridging fee for this forwardAmount
  const outboundBridgingFee = calculateBridgingFee(forwardAmount, hop2OutboundBridgingFeeRate);

  // maxFee = IGP + bridgingFee (both from maxFee, not transfer amount)
  const maxFee = hop2IgpFee + outboundBridgingFee;

  // hubBudget = forwardAmount + maxFee
  const hubBudget = forwardAmount + maxFee;

  // Calculate hop 1 deductions rate (in bigint)
  let hop1DeductionRateBig = 0n;
  if (routeType.startsWith('hl-')) {
    hop1DeductionRateBig += rateToBigInt(hop1InboundBridgingFeeRate);
  }
  if (routeType.startsWith('rollapp-')) {
    hop1DeductionRateBig += rateToBigInt(eibcFeePercent / 100);
    hop1DeductionRateBig += rateToBigInt(delayedAckBridgingFeeRate);
  }

  // hubBudget = amount * (1 - hop1DeductionRate)
  // amount = hubBudget / (1 - hop1DeductionRate)
  // amount = hubBudget * PRECISION / (PRECISION - hop1DeductionRateBig)
  const oneMinusHop1 = PRECISION - hop1DeductionRateBig;
  // Round up
  let sendAmount = (hubBudget * PRECISION + oneMinusHop1 - 1n) / oneMinusHop1;

  // Iterative refinement: verify the calculated amount and adjust if needed
  // This handles rounding differences in fee calculations
  const fullParams: ForwardingParams = {
    ...params,
    amount: sendAmount,
  };

  let result = calculateForwardingFees(fullParams);
  let iterations = 0;
  const maxIterations = 10;

  // If recipient receives less than desired, increment send amount until it works
  while (result.recipientReceives < desiredRecipientAmount && iterations < maxIterations) {
    // Estimate the shortfall and add a bit more
    const shortfall = desiredRecipientAmount - result.recipientReceives;
    // Add the shortfall plus a small buffer to account for fee on the increment
    sendAmount += shortfall + 1n;
    fullParams.amount = sendAmount;
    result = calculateForwardingFees(fullParams);
    iterations++;
  }

  return sendAmount;
}

/**
 * Validate that a forwarding transfer is feasible with given parameters
 *
 * @returns null if valid, or an error message describing the issue
 */
export function validateForwardingParams(params: ForwardingParams): string | null {
  const { amount, hop2IgpFee, hop2OutboundBridgingFeeRate } = params;

  if (amount <= 0n) {
    return 'Amount must be positive';
  }

  if (hop2IgpFee < 0n) {
    return 'IGP fee cannot be negative';
  }

  if (hop2OutboundBridgingFeeRate < 0 || hop2OutboundBridgingFeeRate >= 1) {
    return 'Outbound bridging fee rate must be between 0 and 1';
  }

  // Try to calculate and see if it fails
  try {
    const result = calculateForwardingFees(params);
    if (result.recipientReceives <= 0n) {
      return `Fees exceed transfer amount: recipient would receive ${result.recipientReceives}`;
    }
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}
