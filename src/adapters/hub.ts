/**
 * Hub adapter for outbound transfers via Hyperlane warp routes
 *
 * The Hub uses CosmWasm contracts to send tokens to external chains (EVM, Solana, Kaspa).
 * This adapter creates MsgExecuteContract messages for the warp route contract.
 */

import { toUtf8 } from '@cosmjs/encoding';
import { HUB_MAILBOX } from '../config/constants.js';
import { evmAddressToHyperlane, cosmosAddressToHyperlane } from '../utils/address.js';

/**
 * Parameters for Hub -> External chain transfer
 */
export interface HubTransferParams {
  /** Token to bridge (use HUB_TOKEN_IDS constants) */
  tokenId: string;
  /** Hyperlane destination domain ID */
  destinationDomain: number;
  /** Recipient address (format depends on destination chain) */
  recipient: string;
  /** Amount to transfer (in base token units) */
  amount: bigint;
  /** Sender's Hub address (bech32) */
  sender: string;
  /** Optional gas limit for destination execution */
  gasLimit?: bigint;
  /** Optional custom hook ID (32-byte hex) */
  customHookId?: string;
  /** Optional custom hook metadata (hex string) */
  customHookMetadata?: string;
  /** Optional max fee for IGP payment */
  maxFee?: { denom: string; amount: string };
}

/**
 * MsgExecuteContract message for CosmWasm
 */
export interface MsgExecuteContract {
  typeUrl: string;
  value: {
    sender: string;
    contract: string;
    msg: Uint8Array;
    funds: Array<{ denom: string; amount: string }>;
  };
}

/**
 * Hub adapter for creating outbound Hyperlane transfers
 */
export class HubAdapter {
  /**
   * Create an unsigned MsgExecuteContract for Hub -> External transfer
   *
   * @param params - Transfer parameters
   * @returns CosmWasm MsgExecuteContract message
   */
  populateTransferTx(params: HubTransferParams): MsgExecuteContract {
    const {
      tokenId,
      destinationDomain,
      recipient,
      amount,
      sender,
      gasLimit,
      customHookId,
      customHookMetadata,
      maxFee,
    } = params;

    // Convert recipient to Hyperlane 32-byte format
    const recipientH256 = this.convertRecipientAddress(recipient);

    // Build the warp route message
    const executeMsg = {
      msg_remote_transfer: {
        token_id: tokenId,
        destination_domain: destinationDomain,
        recipient: recipientH256,
        amount: amount.toString(),
        gas_limit: gasLimit?.toString(),
        custom_hook_id: customHookId,
        custom_hook_metadata: customHookMetadata,
        max_fee: maxFee,
      },
    };

    // Serialize to JSON bytes
    const msgBytes = toUtf8(JSON.stringify(executeMsg));

    // Create MsgExecuteContract
    return {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: {
        sender,
        contract: HUB_MAILBOX,
        msg: msgBytes,
        funds: [],
      },
    };
  }

  /**
   * Convert recipient address to Hyperlane 32-byte format based on address type
   *
   * @param recipient - Recipient address (EVM hex, Cosmos bech32, or already 32-byte hex)
   * @returns 32-byte hex string with 0x prefix
   */
  private convertRecipientAddress(recipient: string): string {
    // If already 32-byte hex, return as-is
    if (recipient.startsWith('0x') && recipient.length === 66) {
      return recipient;
    }

    // If EVM address (20 bytes / 42 chars with 0x)
    if (recipient.startsWith('0x') && recipient.length === 42) {
      return evmAddressToHyperlane(recipient);
    }

    // If Cosmos bech32 address
    if (recipient.includes('1')) {
      return cosmosAddressToHyperlane(recipient);
    }

    // Assume it's already 32-byte hex without 0x prefix
    if (recipient.length === 64 && /^[0-9a-fA-F]{64}$/.test(recipient)) {
      return '0x' + recipient;
    }

    throw new Error(
      `Unsupported recipient address format: ${recipient}. ` +
        'Expected EVM (0x...), Cosmos bech32, or 32-byte hex.'
    );
  }
}

/**
 * Create a Hub adapter instance
 */
export function createHubAdapter(): HubAdapter {
  return new HubAdapter();
}
