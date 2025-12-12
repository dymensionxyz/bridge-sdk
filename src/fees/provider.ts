/**
 * Dynamic fee provider for fetching on-chain fee values via REST/LCD
 */

/**
 * Default Hub REST endpoints
 */
export const HUB_REST_ENDPOINTS = {
  mainnet: 'https://dymension-mainnet-rest.public.blastapi.io',
  testnet: 'https://dymension-testnet-rest.public.blastapi.io',
} as const;

/**
 * Configuration for FeeProvider
 */
export interface FeeProviderConfig {
  /** Hub REST URL (defaults to public mainnet endpoint) */
  hubRestUrl?: string;
  /** Cache TTL in milliseconds (defaults to 60000 = 1 minute) */
  cacheMs?: number;
  /** Network (mainnet or testnet) */
  network?: 'mainnet' | 'testnet';
}

/**
 * Hub bridging fee hook response
 */
export interface HLFeeHook {
  id: string;
  owner: string;
  fees: HLAssetFee[];
}

/**
 * Per-token fee configuration
 */
export interface HLAssetFee {
  token_id: string;
  inbound_fee: string;
  outbound_fee: string;
}

/**
 * IGP quote response from Hub
 */
export interface IgpQuoteResponse {
  gas_payment: Array<{ denom: string; amount: string }>;
}

/**
 * Cached value with timestamp
 */
interface CachedValue<T> {
  value: T;
  timestamp: number;
}

/**
 * FeeProvider fetches dynamic fee values from on-chain sources via REST
 *
 * @example
 * ```typescript
 * const provider = new FeeProvider({ network: 'mainnet' });
 *
 * // Get bridging fee rate for a token
 * const rate = await provider.getBridgingFeeRate(tokenId, 'outbound');
 *
 * // Get IGP quote for a transfer
 * const igpFee = await provider.quoteIgpPayment({
 *   destinationDomain: DOMAINS.ETHEREUM,
 *   gasLimit: 150000,
 * });
 * ```
 */
export class FeeProvider {
  private readonly hubRestUrl: string;
  private readonly cacheMs: number;
  private readonly feeHooksCache: Map<string, CachedValue<HLFeeHook>> = new Map();
  private allFeeHooksCache: CachedValue<HLFeeHook[]> | null = null;
  private readonly igpQuoteCache: Map<string, CachedValue<bigint>> = new Map();

  constructor(config: FeeProviderConfig = {}) {
    const network = config.network ?? 'mainnet';
    this.hubRestUrl = config.hubRestUrl ?? HUB_REST_ENDPOINTS[network];
    this.cacheMs = config.cacheMs ?? 60_000;
  }

  /**
   * Get bridging fee rate for a token
   *
   * @param tokenId - Hyperlane token ID (hex address)
   * @param direction - 'inbound' (to Hub) or 'outbound' (from Hub)
   * @returns Fee rate as decimal (e.g., 0.001 for 0.1%)
   * @throws Error if fee cannot be fetched
   */
  async getBridgingFeeRate(
    tokenId: string,
    direction: 'inbound' | 'outbound'
  ): Promise<number> {
    const hooks = await this.fetchAllFeeHooks();

    for (const hook of hooks) {
      const assetFee = hook.fees.find(
        (f) => f.token_id.toLowerCase() === tokenId.toLowerCase()
      );
      if (assetFee) {
        const feeStr = direction === 'inbound' ? assetFee.inbound_fee : assetFee.outbound_fee;
        return parseFloat(feeStr);
      }
    }

    throw new Error(`No fee configuration found for token: ${tokenId}`);
  }

  /**
   * Quote bridging fee for a specific transfer amount
   *
   * @param hookId - Fee hook ID (hex address)
   * @param tokenId - Hyperlane token ID
   * @param amount - Transfer amount
   * @returns Array of fee coins
   */
  async quoteBridgingFee(
    hookId: string,
    tokenId: string,
    amount: bigint
  ): Promise<Array<{ denom: string; amount: string }>> {
    try {
      const url = `${this.hubRestUrl}/dymensionxyz/dymension/bridgingfee/quote_fee_payment/${hookId}/${tokenId}/${amount.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.fee_payment ?? [];
    } catch {
      return [];
    }
  }

  /**
   * Get IGP quote for a Hyperlane transfer from Hub
   *
   * @param params - Quote parameters
   * @returns IGP fee in adym (smallest unit)
   * @throws Error if quote cannot be fetched
   */
  async quoteIgpPayment(params: {
    destinationDomain: number;
    gasLimit: number;
  }): Promise<bigint> {
    const { destinationDomain, gasLimit } = params;

    const cacheKey = `${destinationDomain}-${gasLimit}`;
    const cached = this.igpQuoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMs) {
      return cached.value;
    }

    const url = `${this.hubRestUrl}/hyperlane/v1/igps/0x01/quote_gas_payment?destination_domain=${destinationDomain}&gas_limit=${gasLimit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`IGP quote failed: HTTP ${response.status}`);
    }

    const data: IgpQuoteResponse = await response.json();
    if (!data.gas_payment || data.gas_payment.length === 0) {
      throw new Error(`IGP quote returned empty response for domain ${destinationDomain}`);
    }

    const fee = BigInt(data.gas_payment[0].amount);
    this.igpQuoteCache.set(cacheKey, { value: fee, timestamp: Date.now() });
    return fee;
  }

  /**
   * Get IGP quote for EVM chain via JSON-RPC
   *
   * @param params - Quote parameters
   * @returns IGP fee in wei
   * @throws Error if quote cannot be fetched
   */
  async quoteEvmIgpPayment(params: {
    rpcUrl: string;
    igpAddress: string;
    destinationDomain: number;
    gasLimit: number;
  }): Promise<bigint> {
    const { rpcUrl, igpAddress, destinationDomain, gasLimit } = params;

    const cacheKey = `evm-${igpAddress}-${destinationDomain}-${gasLimit}`;
    const cached = this.igpQuoteCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheMs) {
      return cached.value;
    }

    // Function selector for quoteGasPayment(uint32,uint256)
    const selector = 'b2c766e8';
    const domainHex = destinationDomain.toString(16).padStart(64, '0');
    const gasHex = gasLimit.toString(16).padStart(64, '0');
    const data = `0x${selector}${domainHex}${gasHex}`;

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: igpAddress, data }, 'latest'],
      }),
    });

    const result = await response.json();
    if (result.error) {
      throw new Error(`EVM IGP quote failed: ${result.error.message}`);
    }

    const fee = BigInt(result.result);
    this.igpQuoteCache.set(cacheKey, { value: fee, timestamp: Date.now() });
    return fee;
  }

  /**
   * Fetch all fee hooks from Hub
   */
  async fetchAllFeeHooks(): Promise<HLFeeHook[]> {
    if (this.allFeeHooksCache && Date.now() - this.allFeeHooksCache.timestamp < this.cacheMs) {
      return this.allFeeHooksCache.value;
    }

    const url = `${this.hubRestUrl}/dymensionxyz/dymension/bridgingfee/fee_hooks`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const hooks: HLFeeHook[] = data.fee_hooks ?? [];
    this.allFeeHooksCache = { value: hooks, timestamp: Date.now() };
    return hooks;
  }

  /**
   * Fetch a specific fee hook by ID
   */
  async fetchFeeHook(hookId: string): Promise<HLFeeHook | null> {
    const cached = this.feeHooksCache.get(hookId);
    if (cached && Date.now() - cached.timestamp < this.cacheMs) {
      return cached.value;
    }

    try {
      const url = `${this.hubRestUrl}/dymensionxyz/dymension/bridgingfee/fee_hook/${hookId}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const hook: HLFeeHook = data.fee_hook;
      this.feeHooksCache.set(hookId, { value: hook, timestamp: Date.now() });
      return hook;
    } catch {
      return null;
    }
  }

  /**
   * Clear all cached values
   */
  clearCache(): void {
    this.feeHooksCache.clear();
    this.allFeeHooksCache = null;
    this.igpQuoteCache.clear();
  }
}

/**
 * Create a FeeProvider instance
 */
export function createFeeProvider(config?: FeeProviderConfig): FeeProvider {
  return new FeeProvider(config);
}
