/**
 * Hub adapter for outbound transfers via CosmWasm warp routes
 *
 * The Hub uses CosmWasm Hyperlane contracts for bridging.
 * This adapter constructs MsgExecuteContract messages to call warp routes.
 */

import { toUtf8 } from '@cosmjs/encoding';
import type { Coin } from '@cosmjs/stargate';
import { DEFAULT_IGP_GAS, HUB_WARP_ROUTES } from '../config/constants.js';
import { evmAddressToHyperlane } from '../utils/address.js';

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
  /** Optional IGP gas amount (default from getDefaultGasAmount) */
  gasAmount?: bigint;
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
    const { tokenId, destination, recipient, amount, sender, gasAmount } = params;

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

    const igpAmount = gasAmount ?? this.getDefaultGasAmount(destination);
    const igpDenom = this.getIgpDenom();

    const funds: Coin[] = [
      {
        denom: igpDenom,
        amount: igpAmount.toString(),
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
   * Get the default IGP gas amount for a destination chain
   */
  private getDefaultGasAmount(destination: number): bigint {
    return DEFAULT_IGP_GAS[destination as keyof typeof DEFAULT_IGP_GAS] ?? 100_000n;
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
