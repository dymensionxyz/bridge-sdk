/**
 * Hub adapter for outbound transfers via native Hyperlane warp module
 *
 * The Hub uses the native Cosmos SDK Hyperlane warp module for bridging.
 * This adapter constructs MsgRemoteTransfer messages for cross-chain transfers.
 */

import type { Coin } from '@cosmjs/stargate';
import { DOMAINS, HUB_TOKEN_IDS } from '../config/constants.js';
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
  /** Destination domain ID (DOMAINS.ETHEREUM, etc) */
  destination: number;
  /** EVM recipient address (0x...) */
  recipient: string;
  /** Amount in smallest unit */
  amount: bigint;
  /** Hub sender address (dym1...) */
  sender: string;
  /** IGP gas amount in adym (get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
}

/**
 * Populate a Hub to EVM transfer transaction
 *
 * Creates a MsgRemoteTransfer for the native Hyperlane warp module.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 *
 * @example
 * ```typescript
 * const msg = populateHubToEvmTx({
 *   tokenId: HUB_TOKEN_IDS.DYM,
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
  const { tokenId, destination, recipient, amount, sender, igpFee } = params;

  // Convert EVM address to 32-byte hex (without 0x prefix for the message)
  const recipientHex = evmAddressToHyperlane(recipient).slice(2);

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId,
      destinationDomain: destination,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId: '',
      gasLimit: '0',
      maxFee: {
        denom: 'adym',
        amount: igpFee.toString(),
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
  /** IGP fee in adym (get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
}

/**
 * Populate a Hub to Kaspa transfer transaction
 *
 * Creates a MsgRemoteTransfer for the Hyperlane warp module.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 *
 * @example
 * ```typescript
 * const msg = populateHubToKaspaTx({
 *   sender: 'dym1...',
 *   kaspaRecipient: 'kaspa:qr...',
 *   amount: 5_000_000_000n, // 50 KAS
 *   igpFee: 1000000n,
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

  const destinationDomain = network === 'mainnet'
    ? DOMAINS.KASPA_MAINNET
    : DOMAINS.KASPA_TESTNET;

  // Convert Kaspa address to 32-byte hex (without 0x prefix for the message)
  const recipientHex = kaspaAddressToHyperlane(kaspaRecipient).slice(2);

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId: HUB_TOKEN_IDS.KAS,
      destinationDomain,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId: '',
      gasLimit: '0',
      maxFee: {
        denom: 'adym',
        amount: igpFee.toString(),
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
  /** Solana recipient address (base58 public key) */
  recipient: string;
  /** Amount in smallest unit */
  amount: bigint;
  /** Hub sender address (dym1...) */
  sender: string;
  /** Network selection */
  network?: 'mainnet' | 'testnet';
  /** IGP fee in adym (get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
}

/**
 * Populate a Hub to Solana transfer transaction
 *
 * Creates a MsgRemoteTransfer for the Hyperlane warp module.
 *
 * @param params - Transfer parameters
 * @returns MsgRemoteTransfer message ready for signing with CosmJS
 */
export function populateHubToSolanaTx(params: HubToSolanaParams): MsgRemoteTransfer {
  const {
    tokenId,
    recipient,
    amount,
    sender,
    network = 'mainnet',
    igpFee,
  } = params;

  const destinationDomain = network === 'mainnet'
    ? DOMAINS.SOLANA_MAINNET
    : DOMAINS.SOLANA_TESTNET;

  // Convert Solana address to 32-byte hex (without 0x prefix for the message)
  const recipientHex = solanaAddressToHyperlane(recipient).slice(2);

  return {
    typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer',
    value: {
      sender,
      tokenId,
      destinationDomain,
      recipient: recipientHex,
      amount: amount.toString(),
      customHookId: '',
      gasLimit: '0',
      maxFee: {
        denom: 'adym',
        amount: igpFee.toString(),
      },
      customHookMetadata: '',
    },
  };
}
