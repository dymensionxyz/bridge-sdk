/**
 * Main BridgeClient class for programmatic bridging
 */

import type { PopulatedTransaction } from 'ethers';
import type { DymensionBridgeConfig, ResolvedConfig } from './config/types.js';
import { createConfig } from './config/index.js';
import type { FeeBreakdown } from './fees/index.js';
import { createHubAdapter, type MsgExecuteContract } from './adapters/hub.js';
import { HUB_WARP_ROUTES } from './config/constants.js';
import {
  getChainConfig,
  getHyperlaneDomain,
  getIBCChannelFromHub,
  type ChainName,
} from './config/chains.js';
import {
  getTokenAddress,
  getHubTokenId,
  getHubDenom,
  isTokenAvailableOnChain,
  type TokenSymbol,
  type TokenChainName,
} from './config/tokens.js';
import { createHLMetadataForHL, createHLMetadataForIBC } from './forward/index.js';
import {
  evmAddressToHyperlane,
  kaspaAddressToHyperlane,
  solanaAddressToHyperlane,
} from './utils/address.js';

/**
 * Parameters for Hub to EVM chain transfers
 */
export interface HubToEvmParams {
  tokenId: string;
  destination: number;
  recipient: string;
  amount: bigint;
  sender: string;
  gasAmount?: bigint;
}

/**
 * Parameters for EVM to Hub transfers
 */
export interface EvmToHubParams {
  sourceChain: 'ethereum' | 'base' | 'bsc';
  tokenAddress: string;
  recipient: string;
  amount: bigint;
  sender: string;
  rpcUrl?: string;
}

/**
 * Parameters for Solana to Hub transfers
 */
export interface SolanaToHubParams {
  tokenProgramId: string;
  recipient: string;
  amount: bigint;
  sender: string;
  rpcUrl: string;
}

/**
 * Parameters for Hub to Solana transfers
 */
export interface HubToSolanaParams {
  tokenId: string;
  recipient: string;
  amount: bigint;
  sender: string;
  maxFee?: { denom: string; amount: string };
}

/**
 * Parameters for fee estimation
 */
export interface EstimateFeesParams {
  source: string;
  destination: string;
  amount: bigint;
  eibcFeePercent?: number;
}

/**
 * High-level transfer parameters using chain/token symbols
 */
export interface TransferParams {
  /** Source chain name */
  from: ChainName;
  /** Destination chain name */
  to: ChainName;
  /** Token symbol (e.g., 'KAS', 'ETH', 'DYM') */
  token: TokenSymbol;
  /** Amount in token's smallest unit (e.g., wei for ETH) */
  amount: bigint;
  /** Recipient address on destination chain */
  recipient: string;
  /** Sender address on source chain */
  sender: string;
  /** Fallback recipient on Hub if forwarding fails (defaults to sender's Hub address equivalent) */
  fallbackRecipient?: string;
  /** Optional RPC URL for source chain */
  rpcUrl?: string;
}

/**
 * Result of a high-level transfer operation
 */
export interface TransferResult {
  /** Type of transaction returned */
  type: 'evm' | 'cosmos' | 'solana';
  /** The unsigned transaction, type depends on 'type' field */
  tx: PopulatedTransaction | MsgExecuteContract | unknown;
  /** Route description */
  route: {
    from: ChainName;
    to: ChainName;
    via: 'direct' | 'hub';
  };
}

/**
 * BridgeClient provides methods to construct unsigned bridge transactions
 */
export class BridgeClient {
  private config: ResolvedConfig;

  constructor(userConfig?: DymensionBridgeConfig) {
    this.config = createConfig(userConfig);
  }

  /**
   * Create unsigned transaction for Hub -> EVM transfer
   */
  async populateHubToEvmTx(params: HubToEvmParams): Promise<MsgExecuteContract> {
    const warpRoutes = this.config.contractOverrides?.warpRoutes ?? HUB_WARP_ROUTES;
    const hubAdapter = createHubAdapter(warpRoutes, this.config.network);

    return hubAdapter.populateHubToEvmTx(params);
  }

  /**
   * Create unsigned transaction for Hub -> Solana transfer
   */
  async populateHubToSolanaTx(params: HubToSolanaParams): Promise<unknown> {
    const { tokenId, recipient, amount, sender, maxFee } = params;

    const solanaDomain = this.config.network === 'mainnet'
      ? 1399811149
      : 1399811150;

    return {
      typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
      value: {
        sender,
        contract: tokenId,
        msg: Buffer.from(JSON.stringify({
          transfer_remote: {
            dest_domain: solanaDomain,
            recipient,
            amount: amount.toString(),
          },
        })),
        funds: maxFee ? [maxFee] : [],
      },
    };
  }

  /**
   * Create unsigned transaction for Hub -> Kaspa transfer
   */
  async populateHubToKaspaTx(_params: HubToEvmParams): Promise<unknown> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Create unsigned transaction for EVM -> Hub transfer
   */
  async populateEvmToHubTx(params: EvmToHubParams): Promise<PopulatedTransaction> {
    const { populateEvmToHubTransfer } = await import('./adapters/evm.js');
    return populateEvmToHubTransfer(params);
  }

  /**
   * Create unsigned transaction for Solana -> Hub transfer
   */
  async populateSolanaToHubTx(params: SolanaToHubParams): Promise<unknown> {
    const { buildSolanaToHubTx } = await import('./adapters/solana.js');
    const network = this.config.network || 'mainnet';
    return buildSolanaToHubTx({
      ...params,
      network,
    });
  }

  /**
   * Create Kaspa deposit payload (not full transaction)
   */
  createKaspaDepositPayload(_params: {
    hubRecipient: string;
    amount: bigint;
  }): Uint8Array {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  /**
   * Create forwarding memo for RollApp -> EVM via EIBC
   */
  createRollAppToEvmMemo(_params: {
    eibcFeePercent: number;
    tokenId: string;
    destinationDomain: number;
    recipient: string;
    amount: string;
    maxFee: { denom: string; amount: string };
  }): string {
    // TODO: Implement using forward/memo.ts
    throw new Error('Not implemented');
  }

  /**
   * Estimate all fees for a bridge transfer
   */
  async estimateFees(_params: EstimateFeesParams): Promise<FeeBreakdown> {
    // TODO: Implement
    throw new Error('Not implemented');
  }

  // ============================================
  // High-level Transfer API
  // ============================================

  /**
   * Create an unsigned transfer transaction using chain and token symbols
   *
   * This high-level method automatically:
   * - Looks up token addresses from the registry
   * - Converts addresses to the appropriate format
   * - Routes through Hub if needed for cross-chain transfers
   * - Constructs the appropriate transaction type
   *
   * @example
   * ```typescript
   * // EVM to Hub
   * const result = await client.transfer({
   *   from: 'ethereum',
   *   to: 'dymension',
   *   token: 'KAS',
   *   amount: 100000000n,
   *   recipient: 'dym1abc...',
   *   sender: '0x123...',
   * });
   *
   * // Hub to Kaspa
   * const result = await client.transfer({
   *   from: 'dymension',
   *   to: 'kaspa',
   *   token: 'KAS',
   *   amount: 100000000n,
   *   recipient: 'kaspa:qz...',
   *   sender: 'dym1abc...',
   * });
   * ```
   */
  async transfer(params: TransferParams): Promise<TransferResult> {
    const { from, to, token, recipient } = params;
    const network = this.config.network;

    // Validate token is available on source chain
    const fromChainToken = from as TokenChainName;
    if (!isTokenAvailableOnChain(token, fromChainToken, network)) {
      throw new Error(`Token ${token} is not available on ${from}`);
    }

    // Validate recipient address format
    this.validateAddress(recipient, to);

    // Route the transfer based on source and destination
    if (from === 'dymension') {
      // Hub -> External chain
      return this.transferFromHub(params);
    } else if (to === 'dymension') {
      // External chain -> Hub
      return this.transferToHub(params);
    } else {
      // External -> External (via Hub forwarding)
      return this.transferViaHub(params);
    }
  }

  /**
   * Validate that an address matches the expected format for a chain
   */
  private validateAddress(address: string, chain: ChainName): void {
    const config = getChainConfig(chain);

    if (config.type === 'hub') {
      if (!address.startsWith('dym1')) {
        throw new Error(`Invalid Dymension address: expected dym1... prefix`);
      }
    } else if (config.type === 'hyperlane') {
      if (chain === 'kaspa') {
        if (!address.startsWith('kaspa:')) {
          throw new Error(`Invalid Kaspa address: expected kaspa: prefix`);
        }
      } else if (chain === 'solana') {
        // Solana addresses are base58, roughly 32-44 chars
        if (address.length < 32 || address.length > 44) {
          throw new Error(`Invalid Solana address: unexpected length`);
        }
      } else {
        // EVM chains
        if (!address.startsWith('0x') || address.length !== 42) {
          throw new Error(`Invalid EVM address: expected 0x... with 40 hex chars`);
        }
      }
    } else if (config.type === 'ibc') {
      if (!address.startsWith(config.addressPrefix)) {
        throw new Error(`Invalid ${chain} address: expected ${config.addressPrefix}... prefix`);
      }
    }
  }

  /**
   * Transfer from Hub to an external chain
   */
  private async transferFromHub(params: TransferParams): Promise<TransferResult> {
    const { to, token, amount, recipient, sender } = params;
    const network = this.config.network;

    const tokenId = getHubTokenId(token);
    const toConfig = getChainConfig(to);

    if (toConfig.type === 'hyperlane' || toConfig.type === 'hub') {
      const domain = getHyperlaneDomain(to, network);

      // Convert recipient to Hyperlane bytes32 format
      let recipientBytes32: string;
      if (to === 'kaspa') {
        recipientBytes32 = kaspaAddressToHyperlane(recipient);
      } else if (to === 'solana') {
        recipientBytes32 = solanaAddressToHyperlane(recipient);
      } else {
        recipientBytes32 = evmAddressToHyperlane(recipient);
      }

      const tx = await this.populateHubToEvmTx({
        tokenId,
        destination: domain,
        recipient: recipientBytes32,
        amount,
        sender,
      });

      return {
        type: 'cosmos',
        tx,
        route: { from: 'dymension', to, via: 'direct' },
      };
    }

    throw new Error(`Transfer from Hub to ${to} not yet implemented`);
  }

  /**
   * Transfer from an external chain to Hub
   */
  private async transferToHub(params: TransferParams): Promise<TransferResult> {
    const { from, token, amount, recipient, sender, rpcUrl } = params;
    const network = this.config.network;

    const fromConfig = getChainConfig(from);

    if (fromConfig.type === 'hyperlane') {
      if (from === 'ethereum' || from === 'base' || from === 'bsc') {
        const tokenAddress = getTokenAddress(token, from as TokenChainName, network);

        const { populateEvmToHubTransfer } = await import('./adapters/evm.js');
        const tx = await populateEvmToHubTransfer({
          sourceChain: from,
          tokenAddress,
          recipient,
          amount,
          sender,
          rpcUrl,
        });

        return {
          type: 'evm',
          tx,
          route: { from, to: 'dymension', via: 'direct' },
        };
      } else if (from === 'solana') {
        const tokenAddress = getTokenAddress(token, 'solana', network);

        const { buildSolanaToHubTx } = await import('./adapters/solana.js');
        const tx = await buildSolanaToHubTx({
          tokenProgramId: tokenAddress,
          recipient,
          amount,
          sender,
          rpcUrl: rpcUrl || '',
          network,
        });

        return {
          type: 'solana',
          tx,
          route: { from, to: 'dymension', via: 'direct' },
        };
      } else if (from === 'kaspa') {
        throw new Error('Kaspa -> Hub transfers require manual Kaspa transaction construction');
      }
    }

    throw new Error(`Transfer from ${from} to Hub not yet implemented`);
  }

  /**
   * Transfer between two external chains via Hub (with forwarding)
   */
  private async transferViaHub(params: TransferParams): Promise<TransferResult> {
    const { from, to, token, amount, recipient, sender, fallbackRecipient, rpcUrl } = params;
    const network = this.config.network;

    const fromConfig = getChainConfig(from);
    const toConfig = getChainConfig(to);

    // Need a fallback recipient on Hub
    const hubFallback = fallbackRecipient || sender;
    if (!hubFallback.startsWith('dym1')) {
      throw new Error('fallbackRecipient must be a Dymension address (dym1...) for forwarding transfers');
    }

    // Build forwarding metadata based on destination
    let metadata: Uint8Array;

    if (toConfig.type === 'hyperlane' || toConfig.type === 'hub') {
      // Forward to another Hyperlane chain
      const destDomain = getHyperlaneDomain(to, network);

      let recipientBytes32: string;
      if (to === 'kaspa') {
        recipientBytes32 = kaspaAddressToHyperlane(recipient);
      } else if (to === 'solana') {
        recipientBytes32 = solanaAddressToHyperlane(recipient);
      } else {
        recipientBytes32 = evmAddressToHyperlane(recipient);
      }

      metadata = createHLMetadataForHL({
        transfer: {
          tokenId: getHubTokenId(token),
          destinationDomain: destDomain,
          recipient: recipientBytes32,
          amount: amount.toString(),
          maxFee: { denom: 'adym', amount: '1000000' }, // Default 1 DYM max fee
        },
      });
    } else if (toConfig.type === 'ibc') {
      // Forward to IBC chain
      const channel = getIBCChannelFromHub(to);
      const hubDenom = getHubDenom(token);
      const timeoutNanos = BigInt((Math.floor(Date.now() / 1000) + 3600) * 1_000_000_000); // 1 hour timeout

      metadata = createHLMetadataForIBC({
        sourceChannel: channel,
        sender: hubFallback,
        receiver: recipient,
        token: { denom: hubDenom, amount: amount.toString() },
        timeoutTimestamp: timeoutNanos,
      });
    } else {
      throw new Error(`Cannot forward to chain type: ${(toConfig as { type: string }).type}`);
    }

    // Now build the source chain transaction with forwarding metadata
    if (fromConfig.type === 'hyperlane') {
      if (from === 'ethereum' || from === 'base' || from === 'bsc') {
        const tokenAddress = getTokenAddress(token, from as TokenChainName, network);

        const { populateEvmToHubWithForwarding } = await import('./adapters/evm.js');
        const tx = await populateEvmToHubWithForwarding({
          sourceChain: from,
          tokenAddress,
          hubRecipient: hubFallback,
          amount,
          sender,
          metadata,
          rpcUrl,
        });

        return {
          type: 'evm',
          tx,
          route: { from, to, via: 'hub' },
        };
      } else if (from === 'solana') {
        const tokenAddress = getTokenAddress(token, 'solana', network);

        const { buildSolanaToHubWithForwardingTx } = await import('./adapters/solana.js');
        const tx = await buildSolanaToHubWithForwardingTx({
          tokenProgramId: tokenAddress,
          hubRecipient: hubFallback,
          amount,
          sender,
          metadata,
          rpcUrl: rpcUrl || '',
          network,
        });

        return {
          type: 'solana',
          tx,
          route: { from, to, via: 'hub' },
        };
      }
    }

    throw new Error(`Transfer from ${from} to ${to} via Hub not yet implemented`);
  }

  /**
   * Get the resolved configuration
   */
  getConfig(): ResolvedConfig {
    return this.config;
  }
}

/**
 * Factory function to create a BridgeClient
 */
export function createBridgeClient(config?: DymensionBridgeConfig): BridgeClient {
  return new BridgeClient(config);
}
