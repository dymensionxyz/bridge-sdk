import { describe, it, expect } from 'vitest';
import { HubAdapter, createHubAdapter, getMainnetWarpRoutes, type HubToEvmParams } from '../hub.js';
import { HUB_TOKEN_IDS, DOMAINS } from '../../config/constants.js';
import { fromUtf8 } from '@cosmjs/encoding';

describe('HubAdapter', () => {
  const warpRoutes = {
    [HUB_TOKEN_IDS.DYM]: 'dym1testdymwarp',
    [HUB_TOKEN_IDS.ETH]: 'dym1testethwarp',
    [HUB_TOKEN_IDS.KAS]: 'dym1testkaswarp',
  };

  const adapter = new HubAdapter(warpRoutes, 'mainnet');

  // Test IGP fee (would come from FeeProvider.quoteIgpPayment in production)
  const TEST_IGP_FEE = 100_000_000_000_000_000n;

  describe('getWarpRoute', () => {
    it('should return the correct warp route address for a token', () => {
      expect(adapter.getWarpRoute(HUB_TOKEN_IDS.DYM)).toBe('dym1testdymwarp');
      expect(adapter.getWarpRoute(HUB_TOKEN_IDS.ETH)).toBe('dym1testethwarp');
      expect(adapter.getWarpRoute(HUB_TOKEN_IDS.KAS)).toBe('dym1testkaswarp');
    });

    it('should throw error for unsupported token', () => {
      expect(() => adapter.getWarpRoute('invalid_token_id')).toThrow(
        'No warp route configured for token ID: invalid_token_id'
      );
    });
  });

  describe('populateHubToEvmTx', () => {
    const params: HubToEvmParams = {
      tokenId: HUB_TOKEN_IDS.DYM,
      destination: DOMAINS.ETHEREUM,
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      amount: 1000000000000000000n,
      sender: 'dym1testuser',
      igpFee: TEST_IGP_FEE,
    };

    it('should create a valid MsgExecuteContract', () => {
      const msg = adapter.populateHubToEvmTx(params);

      expect(msg.typeUrl).toBe('/cosmwasm.wasm.v1.MsgExecuteContract');
      expect(msg.value.sender).toBe('dym1testuser');
      expect(msg.value.contract).toBe('dym1testdymwarp');
    });

    it('should encode transfer_remote message correctly', () => {
      const msg = adapter.populateHubToEvmTx(params);

      const decodedMsg = JSON.parse(fromUtf8(msg.value.msg));
      expect(decodedMsg).toHaveProperty('transfer_remote');
      expect(decodedMsg.transfer_remote.dest_domain).toBe(DOMAINS.ETHEREUM);
      expect(decodedMsg.transfer_remote.amount).toBe('1000000000000000000');
      expect(decodedMsg.transfer_remote.recipient).toBe(
        '000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb1'
      );
    });

    it('should include IGP payment in funds', () => {
      const msg = adapter.populateHubToEvmTx(params);

      expect(msg.value.funds).toHaveLength(1);
      expect(msg.value.funds[0].denom).toBe('adym');
      expect(msg.value.funds[0].amount).toBe(TEST_IGP_FEE.toString());
    });

    it('should use provided igpFee', () => {
      const customIgpFee = 200_000_000_000_000_000n;
      const msg = adapter.populateHubToEvmTx({ ...params, igpFee: customIgpFee });

      expect(msg.value.funds[0].amount).toBe(customIgpFee.toString());
    });

    it('should handle different destination chains', () => {
      const baseParams = { ...params, destination: DOMAINS.BASE };
      const msg = adapter.populateHubToEvmTx(baseParams);

      const decodedMsg = JSON.parse(fromUtf8(msg.value.msg));
      expect(decodedMsg.transfer_remote.dest_domain).toBe(DOMAINS.BASE);
    });

    it('should convert EVM recipient to bytes32 format', () => {
      const msg = adapter.populateHubToEvmTx(params);
      const decodedMsg = JSON.parse(fromUtf8(msg.value.msg));

      expect(decodedMsg.transfer_remote.recipient).toMatch(/^[0-9a-f]{64}$/);
      expect(decodedMsg.transfer_remote.recipient).toContain('742d35cc6634c0532925a3b844bc9e7595f0beb1');
    });
  });

  describe('isTokenSupported', () => {
    it('should return true for supported tokens', () => {
      expect(adapter.isTokenSupported(HUB_TOKEN_IDS.DYM)).toBe(true);
      expect(adapter.isTokenSupported(HUB_TOKEN_IDS.ETH)).toBe(true);
      expect(adapter.isTokenSupported(HUB_TOKEN_IDS.KAS)).toBe(true);
    });

    it('should return false for unsupported tokens', () => {
      expect(adapter.isTokenSupported('invalid')).toBe(false);
    });
  });

  describe('getSupportedTokens', () => {
    it('should return all supported token IDs', () => {
      const tokens = adapter.getSupportedTokens();
      expect(tokens).toContain(HUB_TOKEN_IDS.DYM);
      expect(tokens).toContain(HUB_TOKEN_IDS.ETH);
      expect(tokens).toContain(HUB_TOKEN_IDS.KAS);
      expect(tokens).toHaveLength(3);
    });
  });

  describe('createHubAdapter', () => {
    it('should create adapter with provided warp routes', () => {
      const adapter = createHubAdapter(warpRoutes, 'mainnet');
      expect(adapter.getWarpRoute(HUB_TOKEN_IDS.DYM)).toBe('dym1testdymwarp');
    });

    it('should default to mainnet', () => {
      const adapter = createHubAdapter(warpRoutes);
      const msg = adapter.populateHubToEvmTx({
        tokenId: HUB_TOKEN_IDS.DYM,
        destination: DOMAINS.ETHEREUM,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        amount: 1000000000000000000n,
        sender: 'dym1testuser',
        igpFee: TEST_IGP_FEE,
      });
      expect(msg.value.funds[0].denom).toBe('adym');
    });
  });

  describe('getMainnetWarpRoutes', () => {
    it('should return mainnet warp route addresses', () => {
      const routes = getMainnetWarpRoutes();
      expect(routes).toHaveProperty(HUB_TOKEN_IDS.DYM);
      expect(routes).toHaveProperty(HUB_TOKEN_IDS.ETH);
      expect(routes).toHaveProperty(HUB_TOKEN_IDS.KAS);
    });
  });
});
