/**
 * EVM adapter for Hyperlane HypERC20/HypNative token transfers to Hub
 */

import { Contract, PopulatedTransaction, providers } from 'ethers';
import { ETHEREUM_CONTRACTS, BASE_CONTRACTS, BSC_CONTRACTS } from '../config/constants.js';
import { getHyperlaneDomain } from '../config/chains.js';
import { DEFAULT_RPC_URLS } from '../config/rpc.js';
import { cosmosAddressToHyperlane } from '../utils/address.js';

/**
 * Parameters for EVM to Hub transfer
 */
export interface EvmToHubTransferParams {
  sourceChain: 'ethereum' | 'base' | 'bsc';
  tokenAddress: string;
  recipient: string;
  amount: bigint;
  sender: string;
  rpcUrl?: string;
  network?: 'mainnet' | 'testnet';
}

/**
 * Parameters for EVM to Hub transfer with forwarding
 */
export interface EvmToHubWithForwardingParams {
  sourceChain: 'ethereum' | 'base' | 'bsc';
  tokenAddress: string;
  /** Hub recipient address (dym1...) - will receive funds after forwarding completes or if forwarding fails */
  hubRecipient: string;
  amount: bigint;
  sender: string;
  /** HLMetadata bytes for forwarding (use createHLMetadataForIBC or createHLMetadataForHL) */
  metadata: Uint8Array;
  rpcUrl?: string;
  network?: 'mainnet' | 'testnet';
}

/**
 * Minimal ABI for HypERC20/HypNative transferRemote function
 */
const HYPER20_TRANSFER_REMOTE_ABI = [
  'function transferRemote(uint32 _destination, bytes32 _recipient, uint256 _amount) external payable returns (bytes32 messageId)',
  'function quoteGasPayment(uint32 _destinationDomain) external view returns (uint256)',
];

/**
 * Minimal ABI for HypERC20Memo/HypNativeMemo transferRemoteMemo function
 */
const HYPER20_MEMO_ABI = [
  'function transferRemoteMemo(uint32 _destination, bytes32 _recipient, uint256 _amountOrId, bytes calldata memo) external payable returns (bytes32 messageId)',
  'function quoteGasPayment(uint32 _destinationDomain) external view returns (uint256)',
];

/**
 * Get Dymension Hub domain ID
 */
function getHubDomain(network: 'mainnet' | 'testnet' = 'mainnet'): number {
  return getHyperlaneDomain('dymension', network);
}

/**
 * Create an ethers provider for the given chain and RPC URL
 */
function createProvider(chain: 'ethereum' | 'base' | 'bsc', rpcUrl?: string): providers.JsonRpcProvider {
  if (rpcUrl) {
    return new providers.JsonRpcProvider(rpcUrl);
  }

  const url = DEFAULT_RPC_URLS[chain];
  if (!url) {
    throw new Error(`No default RPC URL configured for ${chain}`);
  }

  return new providers.JsonRpcProvider(url);
}

/**
 * Populate an EVM transaction for transferring tokens to Dymension Hub
 *
 * This constructs an unsigned transaction that calls the transferRemote function
 * on a HypERC20 or HypNative contract to bridge tokens to the Dymension Hub.
 *
 * @param params - Transfer parameters
 * @returns PopulatedTransaction ready for signing and sending
 */
export async function populateEvmToHubTransfer(
  params: EvmToHubTransferParams
): Promise<PopulatedTransaction> {
  const { sourceChain, tokenAddress, recipient, amount, sender, rpcUrl, network = 'mainnet' } = params;

  // Validate recipient is a valid Cosmos address
  if (!recipient.startsWith('dym1')) {
    throw new Error('Recipient must be a Dymension address (dym1...)');
  }

  // Convert Cosmos address to Hyperlane 32-byte format
  const recipientBytes32 = cosmosAddressToHyperlane(recipient);

  // Get Hub domain ID
  const hubDomain = getHubDomain(network);

  // Create provider and contract instance
  const provider = createProvider(sourceChain, rpcUrl);
  const contract = new Contract(tokenAddress, HYPER20_TRANSFER_REMOTE_ABI, provider);

  // Quote interchain gas payment
  const gasPayment = await contract.quoteGasPayment(hubDomain);

  // Populate the transferRemote transaction
  const tx = await contract.populateTransaction.transferRemote(
    hubDomain,
    recipientBytes32,
    amount,
    {
      value: gasPayment,
      from: sender,
    }
  );

  return tx;
}

/**
 * Get the contract address for a given token on a chain
 */
export function getEvmTokenContract(
  chain: 'ethereum' | 'base' | 'bsc',
  token: 'ETH' | 'DYM' | 'KAS'
): string {
  const contracts = {
    ethereum: ETHEREUM_CONTRACTS,
    base: BASE_CONTRACTS,
    bsc: BSC_CONTRACTS,
  };

  const tokenMap = {
    ETH: 'ETH_WARP',
    DYM: 'DYM_WARP',
    KAS: 'KAS_WARP',
  } as const;

  const chainContracts = contracts[chain];
  const contractKey = tokenMap[token];

  if (!(contractKey in chainContracts)) {
    throw new Error(`Token ${token} not supported on ${chain}`);
  }

  return chainContracts[contractKey as keyof typeof chainContracts];
}

/**
 * Estimate the interchain gas cost for a transfer
 */
export async function estimateEvmToHubGas(
  sourceChain: 'ethereum' | 'base' | 'bsc',
  tokenAddress: string,
  rpcUrl?: string,
  network: 'mainnet' | 'testnet' = 'mainnet'
): Promise<bigint> {
  const provider = createProvider(sourceChain, rpcUrl);
  const contract = new Contract(tokenAddress, HYPER20_TRANSFER_REMOTE_ABI, provider);

  const hubDomain = getHubDomain(network);
  const gasPayment = await contract.quoteGasPayment(hubDomain);

  return BigInt(gasPayment.toString());
}

/**
 * Populate an EVM transaction for transferring tokens to Hub with forwarding
 *
 * This uses the HypERC20Memo/HypNativeMemo contract's transferRemoteMemo function
 * to send tokens with HLMetadata that instructs the Hub to forward to another chain.
 *
 * Use createHLMetadataForIBC() for forwarding to IBC chains (e.g., Osmosis, Cosmos Hub)
 * Use createHLMetadataForHL() for forwarding to other Hyperlane chains (e.g., Kaspa, other EVM)
 *
 * @param params - Transfer parameters including HLMetadata for forwarding
 * @returns PopulatedTransaction ready for signing and sending
 */
export async function populateEvmToHubWithForwarding(
  params: EvmToHubWithForwardingParams
): Promise<PopulatedTransaction> {
  const { sourceChain, tokenAddress, hubRecipient, amount, sender, metadata, rpcUrl, network = 'mainnet' } = params;

  // Validate recipient is a valid Cosmos address
  if (!hubRecipient.startsWith('dym1')) {
    throw new Error('Hub recipient must be a Dymension address (dym1...)');
  }

  // Convert Cosmos address to Hyperlane 32-byte format
  const recipientBytes32 = cosmosAddressToHyperlane(hubRecipient);

  // Get Hub domain ID
  const hubDomain = getHubDomain(network);

  // Create provider and contract instance with memo ABI
  const provider = createProvider(sourceChain, rpcUrl);
  const contract = new Contract(tokenAddress, HYPER20_MEMO_ABI, provider);

  // Quote interchain gas payment
  const gasPayment = await contract.quoteGasPayment(hubDomain);

  // Convert metadata to hex string for ethers
  const metadataHex = '0x' + Buffer.from(metadata).toString('hex');

  // Populate the transferRemoteMemo transaction
  const tx = await contract.populateTransaction.transferRemoteMemo(
    hubDomain,
    recipientBytes32,
    amount,
    metadataHex,
    {
      value: gasPayment,
      from: sender,
    }
  );

  return tx;
}
