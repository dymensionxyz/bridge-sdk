/**
 * Main BridgeClient class for programmatic bridging
 */

import type { DymensionBridgeConfig, ResolvedConfig } from './config/types.js';
import { createConfig } from './config/index.js';
import type { FeeBreakdown } from './fees/index.js';

/**
 * Parameters for Hub to EVM chain transfers
 */
export interface HubToEvmParams {
  tokenId: string;
  destination: number;
  recipient: string;
  amount: bigint;
  sender: string;
  maxFee?: { denom: string; amount: string };
}

/**
 * Parameters for EVM to Hub transfers
 */
export interface EvmToHubParams {
  chain: 'ethereum' | 'base' | 'bsc';
  token: string;
  recipient: string;
  amount: bigint;
  sender: string;
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
  async populateHubToEvmTx(_params: HubToEvmParams): Promise<unknown> {
    // TODO: Implement using CosmNativeHypCollateralAdapter
    throw new Error('Not implemented');
  }

  /**
   * Create unsigned transaction for Hub -> Solana transfer
   */
  async populateHubToSolanaTx(_params: HubToEvmParams): Promise<unknown> {
    // TODO: Implement
    throw new Error('Not implemented');
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
  async populateEvmToHubTx(_params: EvmToHubParams): Promise<unknown> {
    // TODO: Implement using EvmHypSyntheticAdapter
    throw new Error('Not implemented');
  }

  /**
   * Create unsigned transaction for Solana -> Hub transfer
   */
  async populateSolanaToHubTx(_params: unknown): Promise<unknown> {
    // TODO: Implement using SealevelHypTokenAdapter
    throw new Error('Not implemented');
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
