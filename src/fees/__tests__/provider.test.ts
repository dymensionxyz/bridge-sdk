import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FeeProvider, createFeeProvider, HUB_REST_ENDPOINTS } from '../provider.js';
import { DOMAINS } from '../../config/constants.js';

describe('FeeProvider', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const mockFetch = () => vi.mocked(global.fetch);

  describe('constructor', () => {
    it('should use mainnet endpoint by default', () => {
      const provider = new FeeProvider();
      expect(provider).toBeDefined();
    });

    it('should use testnet endpoint when specified', () => {
      const provider = new FeeProvider({ network: 'testnet' });
      expect(provider).toBeDefined();
    });

    it('should use custom URL when provided', () => {
      const provider = new FeeProvider({ hubRestUrl: 'https://custom.api.com' });
      expect(provider).toBeDefined();
    });
  });

  describe('createFeeProvider', () => {
    it('should create a FeeProvider instance', () => {
      const provider = createFeeProvider();
      expect(provider).toBeInstanceOf(FeeProvider);
    });

    it('should create with config', () => {
      const provider = createFeeProvider({ network: 'testnet' });
      expect(provider).toBeInstanceOf(FeeProvider);
    });
  });

  describe('getBridgingFeeRate', () => {
    it('should throw when fetch fails', async () => {
      mockFetch().mockRejectedValueOnce(new Error('Network error'));

      const provider = new FeeProvider();
      await expect(provider.getBridgingFeeRate('0x123', 'outbound')).rejects.toThrow();
    });

    it('should throw when token not found', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fee_hooks: [] }),
      } as Response);

      const provider = new FeeProvider();
      await expect(provider.getBridgingFeeRate('0xunknown', 'outbound')).rejects.toThrow(
        'No fee configuration found for token: 0xunknown'
      );
    });

    it('should return fee rate from API response', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fee_hooks: [
            {
              id: '0xhook1',
              owner: 'dym1owner',
              fees: [
                {
                  token_id: '0x123',
                  inbound_fee: '0.002',
                  outbound_fee: '0.003',
                },
              ],
            },
          ],
        }),
      } as Response);

      const provider = new FeeProvider();
      const outboundRate = await provider.getBridgingFeeRate('0x123', 'outbound');
      expect(outboundRate).toBe(0.003);
    });
  });

  describe('quoteIgpPayment', () => {
    it('should throw when fetch fails', async () => {
      mockFetch().mockRejectedValueOnce(new Error('Network error'));

      const provider = new FeeProvider();
      await expect(
        provider.quoteIgpPayment({ destinationDomain: DOMAINS.ETHEREUM, gasLimit: 200000 })
      ).rejects.toThrow();
    });

    it('should return fee from API response', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gas_payment: [{ denom: 'adym', amount: '50000000000000000' }],
        }),
      } as Response);

      const provider = new FeeProvider();
      const fee = await provider.quoteIgpPayment({ destinationDomain: DOMAINS.ETHEREUM, gasLimit: 200000 });

      expect(fee).toBe(50_000_000_000_000_000n);
    });

    it('should cache responses', async () => {
      mockFetch().mockResolvedValue({
        ok: true,
        json: async () => ({
          gas_payment: [{ denom: 'adym', amount: '50000000000000000' }],
        }),
      } as Response);

      const provider = new FeeProvider({ cacheMs: 60000 });

      await provider.quoteIgpPayment({ destinationDomain: DOMAINS.ETHEREUM, gasLimit: 200000 });
      await provider.quoteIgpPayment({ destinationDomain: DOMAINS.ETHEREUM, gasLimit: 200000 });

      // Should only fetch once due to caching
      expect(mockFetch()).toHaveBeenCalledTimes(1);
    });
  });

  describe('quoteEvmIgpPayment', () => {
    it('should throw when fetch fails', async () => {
      mockFetch().mockRejectedValueOnce(new Error('Network error'));

      const provider = new FeeProvider();
      await expect(
        provider.quoteEvmIgpPayment({
          rpcUrl: 'https://eth.rpc.com',
          igpAddress: '0xigp',
          destinationDomain: DOMAINS.DYMENSION_MAINNET,
          gasLimit: 200000,
        })
      ).rejects.toThrow();
    });

    it('should return fee from RPC response', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 1,
          result: '0x0de0b6b3a7640000', // 1 ETH in hex
        }),
      } as Response);

      const provider = new FeeProvider();
      const fee = await provider.quoteEvmIgpPayment({
        rpcUrl: 'https://eth.rpc.com',
        igpAddress: '0xigp',
        destinationDomain: DOMAINS.DYMENSION_MAINNET,
        gasLimit: 100000,
      });

      expect(fee).toBe(1_000_000_000_000_000_000n);
    });
  });

  describe('fetchAllFeeHooks', () => {
    it('should fetch and cache fee hooks', async () => {
      const hooks = [
        { id: '0x1', owner: 'dym1', fees: [] },
        { id: '0x2', owner: 'dym2', fees: [] },
      ];

      mockFetch().mockResolvedValue({
        ok: true,
        json: async () => ({ fee_hooks: hooks }),
      } as Response);

      const provider = new FeeProvider({ cacheMs: 60000 });

      const result1 = await provider.fetchAllFeeHooks();
      const result2 = await provider.fetchAllFeeHooks();

      expect(result1).toEqual(hooks);
      expect(result2).toEqual(hooks);
      expect(mockFetch()).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchFeeHook', () => {
    it('should return null when hook not found', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const provider = new FeeProvider();
      const hook = await provider.fetchFeeHook('0xnonexistent');

      expect(hook).toBeNull();
    });

    it('should return hook from API', async () => {
      const hook = { id: '0x1', owner: 'dym1', fees: [] };

      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ fee_hook: hook }),
      } as Response);

      const provider = new FeeProvider();
      const result = await provider.fetchFeeHook('0x1');

      expect(result).toEqual(hook);
    });
  });

  describe('getDelayedAckBridgingFee', () => {
    it('should return bridging fee rate from delayedack params', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          params: {
            epoch_identifier: 'hour',
            bridging_fee: '0.0015',
            delete_packets_epoch_limit: 100,
          },
        }),
      } as Response);

      const provider = new FeeProvider();
      const rate = await provider.getDelayedAckBridgingFee();

      expect(rate).toBe(0.0015);
    });

    it('should throw when fetch fails', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const provider = new FeeProvider();
      await expect(provider.getDelayedAckBridgingFee()).rejects.toThrow(
        'Failed to fetch delayedack params: HTTP 500'
      );
    });

    it('should cache delayedack params', async () => {
      mockFetch().mockResolvedValue({
        ok: true,
        json: async () => ({
          params: {
            epoch_identifier: 'hour',
            bridging_fee: '0.0015',
            delete_packets_epoch_limit: 100,
          },
        }),
      } as Response);

      const provider = new FeeProvider({ cacheMs: 60000 });

      await provider.getDelayedAckBridgingFee();
      await provider.getDelayedAckBridgingFee();

      expect(mockFetch()).toHaveBeenCalledTimes(1);
    });
  });

  describe('quoteBridgingFee', () => {
    it('should return fee coins from API', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fee_coins: [{ denom: 'adym', amount: '1000000' }],
        }),
      } as Response);

      const provider = new FeeProvider();
      const fees = await provider.quoteBridgingFee('0xhook1', '0xtoken1', 1000000000n);

      expect(fees).toEqual([{ denom: 'adym', amount: '1000000' }]);
    });

    it('should throw when fetch fails', async () => {
      mockFetch().mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const provider = new FeeProvider();
      await expect(provider.quoteBridgingFee('0xhook1', '0xtoken1', 1000000n)).rejects.toThrow(
        'Failed to quote bridging fee: HTTP 404'
      );
    });
  });

  describe('clearCache', () => {
    it('should clear all cached values', async () => {
      mockFetch().mockResolvedValue({
        ok: true,
        json: async () => ({ fee_hooks: [] }),
      } as Response);

      const provider = new FeeProvider({ cacheMs: 60000 });

      await provider.fetchAllFeeHooks();
      expect(mockFetch()).toHaveBeenCalledTimes(1);

      provider.clearCache();

      await provider.fetchAllFeeHooks();
      expect(mockFetch()).toHaveBeenCalledTimes(2);
    });
  });

  describe('HUB_REST_ENDPOINTS', () => {
    it('should have mainnet and testnet endpoints', () => {
      expect(HUB_REST_ENDPOINTS.mainnet).toBeDefined();
      expect(HUB_REST_ENDPOINTS.testnet).toBeDefined();
      expect(HUB_REST_ENDPOINTS.mainnet).toContain('mainnet');
      expect(HUB_REST_ENDPOINTS.testnet).toContain('testnet');
    });
  });
});
