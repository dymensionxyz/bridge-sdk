import { describe, it, expect } from 'vitest';
import {
  populateHubToEvmTx,
  populateHubToKaspaTx,
  populateHubToSolanaTx,
  type HubToEvmParams,
  type HubToKaspaParams,
  type HubToSolanaParams,
} from '../hub.js';
import { HUB_TOKEN_IDS, DOMAINS } from '../../config/constants.js';

describe('Hub Native Warp Module', () => {
  // Test IGP fee (would come from FeeProvider.quoteIgpPayment in production)
  const TEST_IGP_FEE = 100_000_000_000_000_000n;

  describe('populateHubToEvmTx', () => {
    const params: HubToEvmParams = {
      tokenId: HUB_TOKEN_IDS.DYM,
      destination: DOMAINS.ETHEREUM,
      recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      amount: 1000000000000000000n,
      sender: 'dym1testuser',
      igpFee: TEST_IGP_FEE,
    };

    it('should create a valid MsgRemoteTransfer', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.typeUrl).toBe('/hyperlane.warp.v1.MsgRemoteTransfer');
      expect(msg.value.sender).toBe('dym1testuser');
      expect(msg.value.tokenId).toBe(HUB_TOKEN_IDS.DYM);
      expect(msg.value.destinationDomain).toBe(DOMAINS.ETHEREUM);
    });

    it('should convert EVM recipient to bytes32 hex without 0x prefix', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.value.recipient).toMatch(/^[0-9a-f]{64}$/);
      expect(msg.value.recipient).toContain('742d35cc6634c0532925a3b844bc9e7595f0beb1');
      expect(msg.value.recipient).not.toContain('0x');
    });

    it('should include IGP payment in maxFee', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.value.maxFee.denom).toBe('adym');
      expect(msg.value.maxFee.amount).toBe(TEST_IGP_FEE.toString());
    });

    it('should convert amount to string', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.value.amount).toBe('1000000000000000000');
    });

    it('should handle different destination chains', () => {
      const baseParams = { ...params, destination: DOMAINS.BASE };
      const msg = populateHubToEvmTx(baseParams);

      expect(msg.value.destinationDomain).toBe(DOMAINS.BASE);
    });

    it('should set empty customHookId and customHookMetadata', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.value.customHookId).toBe('');
      expect(msg.value.customHookMetadata).toBe('');
    });

    it('should set gasLimit to 0', () => {
      const msg = populateHubToEvmTx(params);

      expect(msg.value.gasLimit).toBe('0');
    });
  });

  describe('populateHubToKaspaTx', () => {
    // Use valid Kaspa addresses from address.test.ts
    const KASPA_MAINNET_ADDRESS = 'kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh';
    const KASPA_TESTNET_ADDRESS = 'kaspatest:qzlq49spp66vkjjex0w7z8708f6zteqwr6swy33fmy4za866ne90vhy54uh3j';

    const params: HubToKaspaParams = {
      sender: 'dym1testuser',
      kaspaRecipient: KASPA_MAINNET_ADDRESS,
      amount: 5_000_000_000n, // 50 KAS
      igpFee: TEST_IGP_FEE,
    };

    it('should create a valid MsgRemoteTransfer', () => {
      const msg = populateHubToKaspaTx(params);

      expect(msg.typeUrl).toBe('/hyperlane.warp.v1.MsgRemoteTransfer');
      expect(msg.value.sender).toBe('dym1testuser');
      expect(msg.value.tokenId).toBe(HUB_TOKEN_IDS.KAS);
    });

    it('should use mainnet domain by default', () => {
      const msg = populateHubToKaspaTx(params);

      expect(msg.value.destinationDomain).toBe(DOMAINS.KASPA_MAINNET);
    });

    it('should use testnet domain when specified', () => {
      const msg = populateHubToKaspaTx({
        ...params,
        network: 'testnet',
        kaspaRecipient: KASPA_TESTNET_ADDRESS,
      });

      expect(msg.value.destinationDomain).toBe(DOMAINS.KASPA_TESTNET);
    });

    it('should convert Kaspa recipient to bytes32 hex without 0x prefix', () => {
      const msg = populateHubToKaspaTx(params);

      expect(msg.value.recipient).toMatch(/^[0-9a-f]{64}$/);
      expect(msg.value.recipient).not.toContain('0x');
    });

    it('should include IGP payment in maxFee', () => {
      const msg = populateHubToKaspaTx(params);

      expect(msg.value.maxFee.denom).toBe('adym');
      expect(msg.value.maxFee.amount).toBe(TEST_IGP_FEE.toString());
    });
  });

  describe('populateHubToSolanaTx', () => {
    // Use valid Solana address from address.test.ts
    const SOLANA_ADDRESS = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

    const params: HubToSolanaParams = {
      tokenId: HUB_TOKEN_IDS.DYM,
      recipient: SOLANA_ADDRESS,
      amount: 1000000000n,
      sender: 'dym1testuser',
      igpFee: TEST_IGP_FEE,
    };

    it('should create a valid MsgRemoteTransfer', () => {
      const msg = populateHubToSolanaTx(params);

      expect(msg.typeUrl).toBe('/hyperlane.warp.v1.MsgRemoteTransfer');
      expect(msg.value.sender).toBe('dym1testuser');
      expect(msg.value.tokenId).toBe(HUB_TOKEN_IDS.DYM);
    });

    it('should use mainnet domain by default', () => {
      const msg = populateHubToSolanaTx(params);

      expect(msg.value.destinationDomain).toBe(DOMAINS.SOLANA_MAINNET);
    });

    it('should use testnet domain when specified', () => {
      const msg = populateHubToSolanaTx({ ...params, network: 'testnet' });

      expect(msg.value.destinationDomain).toBe(DOMAINS.SOLANA_TESTNET);
    });

    it('should convert Solana recipient to bytes32 hex without 0x prefix', () => {
      const msg = populateHubToSolanaTx(params);

      expect(msg.value.recipient).toMatch(/^[0-9a-f]{64}$/);
      expect(msg.value.recipient).not.toContain('0x');
    });

    it('should include IGP payment in maxFee', () => {
      const msg = populateHubToSolanaTx(params);

      expect(msg.value.maxFee.denom).toBe('adym');
      expect(msg.value.maxFee.amount).toBe(TEST_IGP_FEE.toString());
    });
  });
});
