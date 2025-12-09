import { describe, it, expect } from 'vitest';
import {
  populateEvmToHubTransfer,
  getEvmTokenContract,
  EvmToHubTransferParams,
} from '../evm.js';
import {
  ETHEREUM_CONTRACTS,
  BASE_CONTRACTS,
  BSC_CONTRACTS,
  DOMAINS,
} from '../../config/constants.js';

describe('EVM Adapter', () => {
  describe('populateEvmToHubTransfer', () => {
    it('should populate transaction for ETH on Ethereum', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1_000_000_000_000_000_000n,
      };

      const tx = populateEvmToHubTransfer(params);

      expect(tx.to).toBe(ETHEREUM_CONTRACTS.ETH_WARP);
      expect(tx.value).toBe('0x0');
      expect(tx.data).toMatch(/^0x81389731/);
      expect(tx.data.length).toBe(2 + 8 + 64 + 64 + 64);
    });

    it('should populate transaction for DYM on Base', () => {
      const params: EvmToHubTransferParams = {
        chain: 'base',
        token: 'DYM',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 5_000_000n,
      };

      const tx = populateEvmToHubTransfer(params);

      expect(tx.to).toBe(BASE_CONTRACTS.DYM_WARP);
      expect(tx.value).toBe('0x0');
      expect(tx.data).toMatch(/^0x81389731/);
    });

    it('should populate transaction for KAS on BSC', () => {
      const params: EvmToHubTransferParams = {
        chain: 'bsc',
        token: 'KAS',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 10_000_000_000n,
      };

      const tx = populateEvmToHubTransfer(params);

      expect(tx.to).toBe(BSC_CONTRACTS.KAS_WARP);
      expect(tx.value).toBe('0x0');
      expect(tx.data).toMatch(/^0x81389731/);
    });

    it('should encode destination domain correctly', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1n,
      };

      const tx = populateEvmToHubTransfer(params);

      const destinationHex = tx.data.slice(10, 74);
      const destination = parseInt(destinationHex, 16);
      expect(destination).toBe(DOMAINS.DYMENSION_MAINNET);
    });

    it('should encode amount correctly', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 12_345_678_900_000_000n,
      };

      const tx = populateEvmToHubTransfer(params);

      const amountHex = tx.data.slice(-64);
      const amount = BigInt('0x' + amountHex);
      expect(amount).toBe(12_345_678_900_000_000n);
    });

    it('should encode recipient address correctly', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1n,
      };

      const tx = populateEvmToHubTransfer(params);

      const recipientHex = tx.data.slice(74, 138);
      expect(recipientHex.length).toBe(64);
      expect(/^[0-9a-f]{64}$/.test(recipientHex)).toBe(true);
    });

    it('should handle large amounts', () => {
      const largeAmount = 1_000_000_000_000_000_000_000_000n;
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: largeAmount,
      };

      const tx = populateEvmToHubTransfer(params);

      const amountHex = tx.data.slice(-64);
      const amount = BigInt('0x' + amountHex);
      expect(amount).toBe(largeAmount);
    });

    it('should handle zero amount', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 0n,
      };

      const tx = populateEvmToHubTransfer(params);

      const amountHex = tx.data.slice(-64);
      expect(amountHex).toBe('0'.repeat(64));
    });
  });

  describe('getEvmTokenContract', () => {
    it('should return correct contract for ETH on Ethereum', () => {
      const contract = getEvmTokenContract('ethereum', 'ETH');
      expect(contract).toBe(ETHEREUM_CONTRACTS.ETH_WARP);
    });

    it('should return correct contract for DYM on Ethereum', () => {
      const contract = getEvmTokenContract('ethereum', 'DYM');
      expect(contract).toBe(ETHEREUM_CONTRACTS.DYM_WARP);
    });

    it('should return correct contract for KAS on Ethereum', () => {
      const contract = getEvmTokenContract('ethereum', 'KAS');
      expect(contract).toBe(ETHEREUM_CONTRACTS.KAS_WARP);
    });

    it('should return correct contract for DYM on Base', () => {
      const contract = getEvmTokenContract('base', 'DYM');
      expect(contract).toBe(BASE_CONTRACTS.DYM_WARP);
    });

    it('should return correct contract for KAS on Base', () => {
      const contract = getEvmTokenContract('base', 'KAS');
      expect(contract).toBe(BASE_CONTRACTS.KAS_WARP);
    });

    it('should throw for ETH on Base', () => {
      expect(() => getEvmTokenContract('base', 'ETH')).toThrow(
        'ETH warp route not available on Base'
      );
    });

    it('should return correct contract for DYM on BSC', () => {
      const contract = getEvmTokenContract('bsc', 'DYM');
      expect(contract).toBe(BSC_CONTRACTS.DYM_WARP);
    });

    it('should return correct contract for KAS on BSC', () => {
      const contract = getEvmTokenContract('bsc', 'KAS');
      expect(contract).toBe(BSC_CONTRACTS.KAS_WARP);
    });

    it('should throw for ETH on BSC', () => {
      expect(() => getEvmTokenContract('bsc', 'ETH')).toThrow(
        'ETH warp route not available on BSC'
      );
    });

    it('should return valid Ethereum addresses', () => {
      const ethContract = getEvmTokenContract('ethereum', 'ETH');
      const dymContract = getEvmTokenContract('base', 'DYM');
      const kasContract = getEvmTokenContract('bsc', 'KAS');

      expect(ethContract).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(dymContract).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(kasContract).toMatch(/^0x[0-9a-fA-F]{40}$/);
    });
  });

  describe('transferRemote encoding', () => {
    it('should use correct function selector', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1n,
      };

      const tx = populateEvmToHubTransfer(params);

      expect(tx.data.slice(0, 10)).toBe('0x81389731');
    });

    it('should have correct calldata length', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1n,
      };

      const tx = populateEvmToHubTransfer(params);

      const expectedLength = 2 + 8 + 64 + 64 + 64;
      expect(tx.data.length).toBe(expectedLength);
    });

    it('should encode parameters in correct order', () => {
      const params: EvmToHubTransferParams = {
        chain: 'ethereum',
        token: 'ETH',
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 123n,
      };

      const tx = populateEvmToHubTransfer(params);

      const selector = tx.data.slice(0, 10);
      const destination = tx.data.slice(10, 74);
      const recipient = tx.data.slice(74, 138);
      const amount = tx.data.slice(138, 202);

      expect(selector).toBe('0x81389731');
      expect(destination.length).toBe(64);
      expect(recipient.length).toBe(64);
      expect(amount.length).toBe(64);
      expect(BigInt('0x' + amount)).toBe(123n);
    });
  });
});
