/**
 * Main BridgeClient class for programmatic bridging
 */

import type { PopulatedTransaction } from 'ethers';
import type { DymensionBridgeConfig, ResolvedConfig } from './config/types.js';
import { createConfig } from './config/index.js';
import type { FeeBreakdown, ForwardingRouteType } from './fees/index.js';
import {
  calculateBridgingFee,
  calculateForwardingFees,
  FeeProvider,
  createFeeProvider,
  multiplyByRate,
} from './fees/index.js';
import {
  createHubAdapter,
  populateHubToKaspaTx,
  type MsgExecuteContract,
  type MsgRemoteTransfer,
} from './adapters/hub.js';
import { serializeKaspaDepositPayload } from './adapters/kaspa.js';
import { createRollAppToHyperlaneMemo } from './forward/memo.js';
import { HUB_WARP_ROUTES } from './config/constants.js';
import {
  getChainConfig,
  getHyperlaneDomain,
  getIBCChannelFromHub,
  getIBCChannelToHub,
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
  createIbcTimeoutTimestamp,
} from './utils/index.js';

/**
 * Parameters for Hub to EVM chain transfers
 */
export interface HubToEvmParams {
  tokenId: string;
  destination: number;
  recipient: string;
  amount: bigint;
  sender: string;
  /** IGP fee in adym (get from FeeProvider.quoteIgpPayment) */
  igpFee: bigint;
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
  /** Token ID for fetching bridging fee rate */
  tokenId?: string;
  /** Gas limit for IGP calculation (defaults to 200000) */
  gasLimit?: number;
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
  tx: PopulatedTransaction | MsgExecuteContract | MsgTransfer | unknown;
  /** Route description */
  route: {
    from: ChainName;
    to: ChainName;
    via: 'direct' | 'hub';
  };
}

/**
 * IBC MsgTransfer message structure
 */
export interface MsgTransfer {
  typeUrl: '/ibc.applications.transfer.v1.MsgTransfer';
  value: {
    sourcePort: string;
    sourceChannel: string;
    token: { denom: string; amount: string };
    sender: string;
    receiver: string;
    timeoutHeight: { revisionNumber: bigint; revisionHeight: bigint };
    timeoutTimestamp: bigint;
    memo: string;
  };
}

/**
 * BridgeClient provides methods to construct unsigned bridge transactions
 */
export class BridgeClient {
  private config: ResolvedConfig;
  private feeProvider: FeeProvider;

  constructor(userConfig?: DymensionBridgeConfig) {
    this.config = createConfig(userConfig);
    this.feeProvider = userConfig?.feeProvider ?? createFeeProvider({
      network: this.config.network,
    });
  }

  /**
   * Get the fee provider instance for direct fee queries
   */
  getFeeProvider(): FeeProvider {
    return this.feeProvider;
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
   *
   * Uses MsgRemoteTransfer for the Hyperlane warp module (native SDK message).
   */
  async populateHubToKaspaTx(params: {
    kaspaRecipient: string;
    amount: bigint;
    sender: string;
    /** IGP fee in adym (get from FeeProvider.quoteIgpPayment) */
    igpFee: bigint;
  }): Promise<MsgRemoteTransfer> {
    return populateHubToKaspaTx({
      sender: params.sender,
      kaspaRecipient: params.kaspaRecipient,
      amount: params.amount,
      network: this.config.network,
      igpFee: params.igpFee,
    });
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
   *
   * Since Kaspa has no smart contracts, this creates a Hyperlane message payload
   * that must be included in a Kaspa transaction to the escrow address.
   *
   * @param params - Deposit parameters
   * @returns Serialized Hyperlane message bytes to include in Kaspa tx
   */
  createKaspaDepositPayload(params: {
    hubRecipient: string;
    amount: bigint;
  }): Uint8Array {
    return serializeKaspaDepositPayload({
      hubRecipient: params.hubRecipient,
      amount: params.amount,
      network: this.config.network,
    });
  }

  /**
   * Create forwarding memo for RollApp -> EVM via EIBC
   *
   * Creates the JSON memo to include in an IBC MsgTransfer from RollApp
   * that will be forwarded via Hyperlane after arriving on Hub.
   *
   * @param params - Forwarding parameters
   * @returns JSON memo string to include in IBC MsgTransfer
   */
  createRollAppToEvmMemo(params: {
    eibcFee: string;
    tokenId: string;
    destinationDomain: number;
    recipient: string;
    amount: string;
    maxFee: { denom: string; amount: string };
  }): string {
    return createRollAppToHyperlaneMemo({
      eibcFee: params.eibcFee,
      transfer: {
        tokenId: params.tokenId,
        destinationDomain: params.destinationDomain,
        recipient: params.recipient,
        amount: params.amount,
        maxFee: params.maxFee,
      },
    });
  }

  /**
   * Estimate all fees for a bridge transfer
   *
   * Calculates approximate fees for different transfer scenarios:
   * - Bridging fee (protocol fee, fetched dynamically or default 0.1%)
   * - EIBC fee for RollApp withdrawals (if applicable)
   * - IGP fee for Hyperlane gas costs (fetched dynamically)
   * - Transaction fee on source chain (estimated)
   *
   * @param params - Fee estimation parameters
   * @returns Breakdown of all fees and recipient amount
   */
  async estimateFees(params: EstimateFeesParams): Promise<FeeBreakdown> {
    const { source, destination, amount, eibcFeePercent, tokenId, gasLimit } = params;
    const network = this.config.network;

    // Get dynamic bridging fee rate from chain
    const bridgingFeeRate = tokenId
      ? await this.feeProvider.getBridgingFeeRate(tokenId, 'outbound')
      : 0.001; // Default 0.1% if no tokenId provided
    const bridgingFee = calculateBridgingFee(amount, bridgingFeeRate);

    // Calculate EIBC fee if this is a RollApp withdrawal
    let eibcFee: bigint | undefined;
    const sourceConfig = getChainConfig(source as ChainName);
    if (sourceConfig.type === 'ibc' && eibcFeePercent !== undefined) {
      eibcFee = multiplyByRate(amount, eibcFeePercent / 100);
    }

    // Calculate IGP fee based on destination
    let igpFee = 0n;
    const destConfig = getChainConfig(destination as ChainName);
    if (destConfig.type === 'hyperlane' || destConfig.type === 'hub') {
      const domain = getHyperlaneDomain(destination as ChainName, network);
      const effectiveGasLimit = gasLimit ?? 200_000;
      igpFee = await this.feeProvider.quoteIgpPayment({
        destinationDomain: domain,
        gasLimit: effectiveGasLimit,
      });
    }

    // Estimate transaction fee (varies by chain, use placeholder)
    const txFee = 50_000n; // Placeholder - actual fee depends on chain and gas price

    // Calculate totals
    const totalFees = bridgingFee + (eibcFee ?? 0n) + igpFee + txFee;
    const recipientReceives = amount - bridgingFee - (eibcFee ?? 0n);

    return {
      bridgingFee,
      eibcFee,
      igpFee,
      txFee,
      totalFees,
      recipientReceives,
    };
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

      // Fetch IGP fee from chain
      const igpFee = await this.feeProvider.quoteIgpPayment({
        destinationDomain: domain,
        gasLimit: 200_000,
      });

      const tx = await this.populateHubToEvmTx({
        tokenId,
        destination: domain,
        recipient: recipientBytes32,
        amount,
        sender,
        igpFee,
      });

      return {
        type: 'cosmos',
        tx,
        route: { from: 'dymension', to, via: 'direct' },
      };
    }

    // Handle IBC chain destinations
    if (toConfig.type === 'ibc') {
      const channel = getIBCChannelFromHub(to);
      const denom = getHubDenom(token);

      const timeoutTimestamp = createIbcTimeoutTimestamp();

      const tx: MsgTransfer = {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: {
          sourcePort: 'transfer',
          sourceChannel: channel,
          token: { denom, amount: amount.toString() },
          sender,
          receiver: recipient,
          timeoutHeight: { revisionNumber: 0n, revisionHeight: 0n },
          timeoutTimestamp,
          memo: '',
        },
      };

      return {
        type: 'cosmos',
        tx,
        route: { from: 'dymension', to, via: 'direct' },
      };
    }

    throw new Error(`Transfer from Hub to ${to} not supported: unknown chain type`);
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

    // Handle IBC chain sources
    if (fromConfig.type === 'ibc') {
      const channel = getIBCChannelToHub(from);

      // For IBC transfers, the denom is the native token on the source chain
      // The SDK consumer needs to know what denom to use on their chain
      // This is typically the IBC denom of the token on that chain
      const denom = getHubDenom(token);

      const timeoutTimestamp = createIbcTimeoutTimestamp();

      const tx: MsgTransfer = {
        typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
        value: {
          sourcePort: 'transfer',
          sourceChannel: channel,
          token: { denom, amount: amount.toString() },
          sender,
          receiver: recipient,
          timeoutHeight: { revisionNumber: 0n, revisionHeight: 0n },
          timeoutTimestamp,
          memo: '',
        },
      };

      return {
        type: 'cosmos',
        tx,
        route: { from, to: 'dymension', via: 'direct' },
      };
    }

    throw new Error(`Transfer from ${from} to Hub not supported: unknown chain type`);
  }

  /**
   * Transfer between two external chains via Hub (with forwarding)
   *
   * This method properly calculates fees for both hops:
   * - Hop 1: source -> Hub (inbound bridging fee deducted from amount)
   * - Hop 2: Hub -> destination (IGP fee + outbound bridging fee)
   *
   * The forwarding metadata uses calculated amounts that ensure sufficient budget
   * for both hops, satisfying the x/forward constraint: maxFee + forwardAmount <= hubBudget
   */
  private async transferViaHub(params: TransferParams): Promise<TransferResult> {
    const { from, to, token, amount, recipient, sender, fallbackRecipient, rpcUrl } = params;
    const network = this.config.network;

    const fromConfig = getChainConfig(from);
    const toConfig = getChainConfig(to);
    const tokenId = getHubTokenId(token);

    // Need a fallback recipient on Hub
    const hubFallback = fallbackRecipient || sender;
    if (!hubFallback.startsWith('dym1')) {
      throw new Error('fallbackRecipient must be a Dymension address (dym1...) for forwarding transfers');
    }

    // Determine the forwarding route type
    let routeType: ForwardingRouteType;
    const hop2IsHL = toConfig.type === 'hyperlane' || toConfig.type === 'hub';

    if (fromConfig.type === 'hyperlane') {
      routeType = hop2IsHL ? 'hl-hub-hl' : 'hl-hub-ibc';
    } else if (fromConfig.type === 'ibc') {
      routeType = hop2IsHL ? 'ibc-hub-hl' : 'rollapp-hub-ibc'; // Will throw below for IBC sources
    } else {
      throw new Error(`Unsupported source chain type for forwarding: ${fromConfig.type}`);
    }

    // Build forwarding metadata based on destination
    let metadata: Uint8Array;

    if (toConfig.type === 'hyperlane' || toConfig.type === 'hub') {
      // Forward to another Hyperlane chain
      const destDomain = getHyperlaneDomain(to, network);

      // Fetch fees dynamically for proper calculation
      const hop2IgpFee = await this.feeProvider.quoteIgpPayment({
        destinationDomain: destDomain,
        gasLimit: 200_000,
      });

      // Fetch bridging fee rates
      let hop1InboundBridgingFeeRate = 0;
      let hop2OutboundBridgingFeeRate = 0;
      try {
        hop1InboundBridgingFeeRate = await this.feeProvider.getBridgingFeeRate(tokenId, 'inbound');
        hop2OutboundBridgingFeeRate = await this.feeProvider.getBridgingFeeRate(tokenId, 'outbound');
      } catch {
        // Use defaults if fee hooks not found
        hop1InboundBridgingFeeRate = 0.001;
        hop2OutboundBridgingFeeRate = 0.001;
      }

      // Calculate forwarding fees to get correct amounts
      const fwdCalc = calculateForwardingFees({
        amount,
        routeType,
        hop1InboundBridgingFeeRate,
        hop2IgpFee,
        hop2OutboundBridgingFeeRate,
      });

      let recipientBytes32: string;
      if (to === 'kaspa') {
        recipientBytes32 = kaspaAddressToHyperlane(recipient);
      } else if (to === 'solana') {
        recipientBytes32 = solanaAddressToHyperlane(recipient);
      } else {
        recipientBytes32 = evmAddressToHyperlane(recipient);
      }

      // Use calculated forwardAmount and maxFee from the fee calculator
      metadata = createHLMetadataForHL({
        transfer: {
          tokenId,
          destinationDomain: destDomain,
          recipient: recipientBytes32,
          amount: fwdCalc.forwardAmount.toString(),
          maxFee: { denom: 'adym', amount: fwdCalc.maxFee.toString() },
        },
      });
    } else if (toConfig.type === 'ibc') {
      // Forward to IBC chain
      // Note: For IBC destinations, the amount forwarded is the hubBudget minus any fees
      // IBC transfers don't have IGP fees, but may have other fees

      const channel = getIBCChannelFromHub(to);
      const hubDenom = getHubDenom(token);
      const timeoutNanos = createIbcTimeoutTimestamp();

      // Fetch inbound bridging fee for hop 1
      let hop1InboundBridgingFeeRate = 0;
      try {
        hop1InboundBridgingFeeRate = await this.feeProvider.getBridgingFeeRate(tokenId, 'inbound');
      } catch {
        hop1InboundBridgingFeeRate = 0.001;
      }

      // Calculate what arrives at Hub after hop 1 fees
      const inboundFee = calculateBridgingFee(amount, hop1InboundBridgingFeeRate);
      const hubBudget = amount - inboundFee;

      metadata = createHLMetadataForIBC({
        sourceChannel: channel,
        sender: hubFallback,
        receiver: recipient,
        token: { denom: hubDenom, amount: hubBudget.toString() },
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

    // IBC source chains (RollApps, Cosmos chains) can use EIBC/PFM forwarding
    // This requires the IBC memo to contain forwarding instructions
    if (fromConfig.type === 'ibc') {
      // For IBC → other chain, we need to use Packet Forward Middleware (PFM)
      // or EIBC memo forwarding depending on the source chain
      throw new Error(
        `Transfer from ${from} to ${to} via Hub requires IBC memo forwarding. ` +
          `Use createRollAppToEvmMemo() to construct the forwarding memo, ` +
          `then include it in a standard IBC MsgTransfer.`
      );
    }

    throw new Error(`Transfer from ${from} to ${to} via Hub not supported: unknown source chain type`);
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
