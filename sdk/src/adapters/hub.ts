/**
 * Hub adapter for outbound transfers via native Hyperlane warp module
 *
 * The Hub uses the native Cosmos SDK Hyperlane warp module for bridging.
 * This adapter constructs MsgRemoteTransfer messages for cross-chain transfers.
 */

import type { Coin } from '@cosmjs/stargate';
import { HUB_TOKEN_IDS } from '../config/constants.js';
import { getHyperlaneDomain } from '../config/chains.js';
import { getHubDenom, getIgpHookForToken, type TokenSymbol } from '../config/tokens.js';
import { evmAddressToHyperlane, kaspaAddressToHyperlane, solanaAddressToHyperlane } from '../utils/address.js';

/**
 * MsgRemoteTransfer for Hyperlane warp module
 *
 * This is the native Cosmos SDK message type for Hub outbound transfers.
 */
export interface MsgRemoteTransfer {
  typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer';
  value: {
    sender: string;
    tokenId: string;
    destinationDomain: number;
    recipient: string;
    amount: string;
    customHookId: string;
    gasLimit: string;
    maxFee: Coin;
    customHookMetadata: string;
  };
}

/**
 * Parameters for Hub to EVM transfer
 */
export interface HubToEvmParams {
  /** Hub token ID (HUB_TOKEN_IDS.DYM, etc) */
  tokenId: string;
  /** Token symbol for IGP hook selection (DYM, KAS, ETH) */
  token: TokenSymbol;
  /** Destination domain ID (DOMAINS.ETHEREUM, etc) */
  destination: number;
  /** EVM recipient address (0x...) */
  recipient: string;
  /** Amount in smallest unit */
  amount: bigint;
  /** Hub sender address (dym1...) */
  sender: string;
  /** IGP fee amount (in the token's hub denom) */
  igpFee: bigint;
}

/**
 * Populate a Hub to EVM transfer transaction
 *
 * Creates a MsgRemoteTransfer for the native Hyperlane warp module.
 * Uses the token-specific IGP hook and denom for gas payment.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 *
 * @example
 * ```typescript
 * const msg = populateHubToEvmTx({
 *   tokenId: HUB_TOKEN_IDS.DYM,
 *   token: 'DYM',
 *   destination: DOMAINS.ETHEREUM,
 *   recipient: '0x742d35Cc...',
 *   amount: 1000000000000000000n, // 1 DYM
 *   sender: 'dym1...',
 *   igpFee: 1000000n,
 * });
 *
 * const result = await client.signAndBroadcast(sender, [msg], 'auto');
 * ```
 */
export function populateHubToEvmTx(params: HubToEvmParams): MsgRemoteTransfer {
  const { tokenId, token, destination, recipient, amount, sender, igpFee } = params;

  // Get token-specific denom
  const igpDenom = getHubDenom(token);

  // Only use IGP hook when we have a positive IGP fee
  // When igpFee is 0, omit the hook to avoid "maxFee is required" validation error
  const customHookId = igpFee > 0n ? getIgpHookForToken(token) : '';

  // maxFee must be at least 1 - chain rejects amount=0 even without custom hook
  const effectiveMaxFee = igpFee > 0n ? igpFee : 1n;

  // Convert EVM address to 32-byte hex (with 0x prefix - HexAddress is encoded as string)
  const recipientHex = evmAddressToHyperlane(recipient);

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId,
      destinationDomain: destination,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId,
      gasLimit: '0',
      maxFee: {
        denom: igpDenom,
        amount: effectiveMaxFee.toString(),
      },
      customHookMetadata: '',
    },
  };
}

/**
 * Parameters for Hub to Kaspa transfer
 */
export interface HubToKaspaParams {
  /** Hub sender address (dym1...) */
  sender: string;
  /** Kaspa recipient address (kaspa:... or kaspatest:...) */
  kaspaRecipient: string;
  /** Amount in sompi (1 KAS = 100,000,000 sompi) */
  amount: bigint;
  /** Network selection */
  network?: 'mainnet' | 'testnet';
  /** IGP fee in KAS denom (required - get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
}

/**
 * Populate a Hub to Kaspa transfer transaction
 *
 * Creates a MsgRemoteTransfer for the Hyperlane warp module.
 * Requires IGP fee payment via the KAS IGP hook.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 *
 * @example
 * ```typescript
 * // Get IGP fee from fee provider
 * const feeProvider = createFeeProvider({ network: 'mainnet' });
 * const igpFee = await feeProvider.quoteIgpPayment({
 *   destinationDomain: DOMAINS.KASPA_MAINNET,
 *   gasLimit: 200_000,
 *   token: 'KAS',
 * });
 *
 * const msg = populateHubToKaspaTx({
 *   sender: 'dym1...',
 *   kaspaRecipient: 'kaspa:qr...',
 *   amount: 5_000_000_000n, // 50 KAS
 *   igpFee,
 * });
 *
 * const result = await client.signAndBroadcast(sender, [msg], 'auto');
 * ```
 */
export function populateHubToKaspaTx(params: HubToKaspaParams): MsgRemoteTransfer {
  const {
    sender,
    kaspaRecipient,
    amount,
    network = 'mainnet',
    igpFee,
  } = params;

  const destinationDomain = getHyperlaneDomain('kaspa', network);

  // Convert Kaspa address to 32-byte hex (with 0x prefix - HexAddress is encoded as string)
  const recipientHex = kaspaAddressToHyperlane(kaspaRecipient);

  // Only use IGP hook when we have a positive IGP fee
  // When igpFee is 0 (e.g., Kaspa domain not registered in IGP), omit the hook
  // to avoid "maxFee is required" validation error
  const igpDenom = getHubDenom('KAS');
  const customHookId = igpFee > 0n ? getIgpHookForToken('KAS') : '';

  // maxFee must be at least 1 - chain rejects amount=0 even without custom hook
  const effectiveMaxFee = igpFee > 0n ? igpFee : 1n;

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId: HUB_TOKEN_IDS.KAS,
      destinationDomain,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId,
      gasLimit: '0',
      maxFee: {
        denom: igpDenom,
        amount: effectiveMaxFee.toString(),
      },
      customHookMetadata: '',
    },
  };
}

/**
 * Parameters for Hub to Solana transfer
 */
export interface HubToSolanaParams {
  /** Hub token ID */
  tokenId: string;
  /** Token symbol for IGP hook selection (DYM, KAS, ETH) */
  token: TokenSymbol;
  /** Solana recipient address (base58 public key) */
  recipient: string;
  /** Amount in smallest unit */
  amount: bigint;
  /** Hub sender address (dym1...) */
  sender: string;
  /** Network selection */
  network?: 'mainnet' | 'testnet';
  /** IGP fee in the token's hub denom (get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
}

/**
 * Populate a Hub to Solana transfer transaction
 *
 * Creates a MsgRemoteTransfer for the Hyperlane warp module.
 * Requires IGP fee payment via the token-specific IGP hook.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 */
export function populateHubToSolanaTx(params: HubToSolanaParams): MsgRemoteTransfer {
  const {
    tokenId,
    token,
    recipient,
    amount,
    sender,
    network = 'mainnet',
    igpFee,
  } = params;

  const destinationDomain = getHyperlaneDomain('solana', network);

  // Convert Solana address to 32-byte hex (with 0x prefix - HexAddress is encoded as string)
  const recipientHex = solanaAddressToHyperlane(recipient);

  // Get token-specific denom
  const igpDenom = getHubDenom(token);

  // Only use IGP hook when we have a positive IGP fee
  // When igpFee is 0, omit the hook to avoid "maxFee is required" validation error
  const customHookId = igpFee > 0n ? getIgpHookForToken(token) : '';

  // maxFee must be at least 1 - chain rejects amount=0 even without custom hook
  const effectiveMaxFee = igpFee > 0n ? igpFee : 1n;

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId,
      destinationDomain,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId,
      gasLimit: '0',
      maxFee: {
        denom: igpDenom,
        amount: effectiveMaxFee.toString(),
      },
      customHookMetadata: '',
    },
  };
}
