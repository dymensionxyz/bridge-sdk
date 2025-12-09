/**
 * EVM adapter for bridging to Dymension Hub via Hyperlane
 *
 * EVM chains use Hyperlane warp route contracts that implement HypERC20.
 * Users call transferRemote(uint32 destination, bytes32 recipient, uint256 amount)
 * to initiate a bridge transfer.
 */

import {
  ETHEREUM_CONTRACTS,
  BASE_CONTRACTS,
  BSC_CONTRACTS,
  DOMAINS,
} from '../config/constants.js';
import { cosmosAddressToHyperlane } from '../utils/address.js';

/**
 * Supported EVM chains
 */
export type EvmChain = 'ethereum' | 'base' | 'bsc';

/**
 * Supported tokens on each chain
 */
export type EvmToken = 'ETH' | 'DYM' | 'KAS';

/**
 * Unsigned EVM transaction data
 */
export interface EvmTransactionData {
  /** Contract address to call */
  to: string;
  /** Encoded function call data */
  data: string;
  /** ETH value to send (always 0 for ERC20 transfers) */
  value: string;
}

/**
 * Parameters for EVM to Hub transfer
 */
export interface EvmToHubTransferParams {
  /** Source chain */
  chain: EvmChain;
  /** Token to transfer */
  token: EvmToken;
  /** Hub recipient address (bech32 dym1... format) */
  hubRecipient: string;
  /** Amount in token's smallest unit (wei for ETH, etc.) */
  amount: bigint;
}

/**
 * Populate an unsigned EVM transaction for transferring tokens to Dymension Hub
 *
 * @param params - Transfer parameters
 * @returns Unsigned transaction data with to, data, and value fields
 */
export function populateEvmToHubTransfer(params: EvmToHubTransferParams): EvmTransactionData {
  const { chain, token, hubRecipient, amount } = params;

  const contractAddress = getEvmTokenContract(chain, token);
  const recipientH256 = cosmosAddressToHyperlane(hubRecipient);
  const destination = DOMAINS.DYMENSION_MAINNET;

  const data = encodeTransferRemote(destination, recipientH256, amount);

  return {
    to: contractAddress,
    data,
    value: '0x0',
  };
}

/**
 * Get the warp route contract address for a token on a specific chain
 *
 * @param chain - EVM chain
 * @param token - Token symbol
 * @returns Contract address
 */
export function getEvmTokenContract(chain: EvmChain, token: EvmToken): string {
  switch (chain) {
    case 'ethereum':
      switch (token) {
        case 'ETH':
          return ETHEREUM_CONTRACTS.ETH_WARP;
        case 'DYM':
          return ETHEREUM_CONTRACTS.DYM_WARP;
        case 'KAS':
          return ETHEREUM_CONTRACTS.KAS_WARP;
      }
    case 'base':
      switch (token) {
        case 'DYM':
          return BASE_CONTRACTS.DYM_WARP;
        case 'KAS':
          return BASE_CONTRACTS.KAS_WARP;
        case 'ETH':
          throw new Error('ETH warp route not available on Base');
      }
    case 'bsc':
      switch (token) {
        case 'DYM':
          return BSC_CONTRACTS.DYM_WARP;
        case 'KAS':
          return BSC_CONTRACTS.KAS_WARP;
        case 'ETH':
          throw new Error('ETH warp route not available on BSC');
      }
  }
}

/**
 * Encode the transferRemote function call
 *
 * Function signature: transferRemote(uint32 destination, bytes32 recipient, uint256 amount)
 * Selector: 0x81389731
 *
 * @param destination - Hyperlane domain ID (uint32)
 * @param recipient - Recipient address as 32-byte hex (bytes32)
 * @param amount - Amount to transfer (uint256)
 * @returns Encoded calldata as hex string with 0x prefix
 */
function encodeTransferRemote(
  destination: number,
  recipient: string,
  amount: bigint
): string {
  const selector = '0x81389731';

  const destinationEncoded = u32ToHex(destination);
  const recipientEncoded = recipient.startsWith('0x') ? recipient.slice(2) : recipient;
  const amountEncoded = u256ToHex(amount);

  return selector + destinationEncoded + recipientEncoded + amountEncoded;
}

/**
 * Convert uint32 to 32-byte hex string (left-padded)
 */
function u32ToHex(value: number): string {
  return value.toString(16).padStart(64, '0');
}

/**
 * Convert uint256 to 32-byte hex string (left-padded)
 */
function u256ToHex(value: bigint): string {
  return value.toString(16).padStart(64, '0');
}
