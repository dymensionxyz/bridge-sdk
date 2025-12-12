/**
 * Hub adapter for outbound transfers via CosmWasm warp routes
 *
 * The Hub uses CosmWasm Hyperlane contracts for bridging.
 * This adapter constructs MsgExecuteContract messages to call warp routes.
 */

import { toUtf8 } from '@cosmjs/encoding';
import type { Coin } from '@cosmjs/stargate';
import { HUB_WARP_ROUTES, DOMAINS, HUB_TOKEN_IDS } from '../config/constants.js';
import { evmAddressToHyperlane, kaspaAddressToHyperlane } from '../utils/address.js';

/**
 * CosmWasm MsgExecuteContract message type
 */
export interface MsgExecuteContract {
  typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract';
  value: {
    sender: string;
    contract: string;
    msg: Uint8Array;
    funds: Coin[];
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
 * Warp route contract address mapping
 */
export interface WarpRouteAddresses {
  [tokenId: string]: string;
}

/**
 * Hub adapter for creating warp route transfer transactions
 */
export class HubAdapter {
  constructor(
    private readonly warpRoutes: WarpRouteAddresses,
    private readonly network: 'mainnet' | 'testnet' = 'mainnet',
  ) {}

  /**
   * Get the warp route contract address for a token
   */
  getWarpRoute(tokenId: string): string {
    const address = this.warpRoutes[tokenId];
    if (!address) {
      throw new Error(`No warp route configured for token ID: ${tokenId}`);
    }
    return address;
  }

  /**
   * Populate a Hub to EVM transfer transaction
   *
   * Creates a MsgExecuteContract that calls the warp route's transfer_remote function.
   *
   * @param params - Transfer parameters
   * @returns CosmWasm execute message ready for signing
   */
  populateHubToEvmTx(params: HubToEvmParams): MsgExecuteContract {
    const { tokenId, destination, recipient, amount, sender, igpFee } = params;

    const warpRouteAddress = this.getWarpRoute(tokenId);

    const recipientBytes32 = evmAddressToHyperlane(recipient);
    const recipientHex = recipientBytes32.slice(2);

    const msg = {
      transfer_remote: {
        dest_domain: destination,
        recipient: recipientHex,
        amount: amount.toString(),
      },
    };

    const msgBytes = toUtf8(JSON.stringify(msg));
    const igpDenom = this.getIgpDenom();

    const funds: Coin[] = [
      {
        denom: igpDenom,
        amount: igpFee.toString(),
      },
    ];

    return {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: {
        sender,
        contract: warpRouteAddress,
        msg: msgBytes,
        funds,
      },
    };
  }

  /**
   * Get the IGP payment denomination
   */
  private getIgpDenom(): string {
    return this.network === 'mainnet' ? 'adym' : 'adym';
  }

  /**
   * Validate that a token ID is supported
   */
  isTokenSupported(tokenId: string): boolean {
    return tokenId in this.warpRoutes;
  }

  /**
   * Get all supported token IDs
   */
  getSupportedTokens(): string[] {
    return Object.keys(this.warpRoutes);
  }
}

/**
 * Create a Hub adapter with default warp route addresses
 */
export function createHubAdapter(
  warpRoutes: WarpRouteAddresses,
  network: 'mainnet' | 'testnet' = 'mainnet',
): HubAdapter {
  return new HubAdapter(warpRoutes, network);
}

/**
 * Utility to get default warp route addresses for mainnet
 */
export function getMainnetWarpRoutes(): WarpRouteAddresses {
  return HUB_WARP_ROUTES;
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
 * MsgRemoteTransfer for Hyperlane warp module
 *
 * This is the native Cosmos SDK message type for Hub → Kaspa transfers.
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
 * Populate a Hub to Kaspa transfer transaction
 *
 * Creates a MsgRemoteTransfer for the Hyperlane warp module.
 * This is a standalone function that doesn't require the HubAdapter class.
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
