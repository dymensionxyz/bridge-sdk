/**
 * Tests for EVM adapter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Contract } from 'ethers';
import { populateEvmToHubTransfer, getEvmTokenContract, estimateEvmToHubGas } from '../evm.js';
import { ETHEREUM_CONTRACTS, BASE_CONTRACTS, BSC_CONTRACTS, DOMAINS } from '../../config/constants.js';

vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    providers: {
      JsonRpcProvider: vi.fn().mockImplementation(() => ({
        getNetwork: vi.fn().mockResolvedValue({ chainId: 1 }),
      })),
    },
    Contract: vi.fn().mockImplementation(() => ({
      quoteGasPayment: vi.fn().mockResolvedValue('100000000000000000'),
      populateTransaction: {
        transferRemote: vi.fn().mockResolvedValue({
          to: '0x1234567890123456789012345678901234567890',
          data: '0xabcdef',
          value: '100000000000000000',
        }),
      },
    })),
  };
});

describe('EVM Adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('populateEvmToHubTransfer', () => {
    it('should create a populated transaction for Ethereum to Hub', async () => {
      const params = {
        sourceChain: 'ethereum' as const,
        tokenAddress: ETHEREUM_CONTRACTS.ETH_WARP,
        recipient: 'dym1abcdefghijklmnopqrstuvwxyz1234567890ab',
        amount: 1000000000000000000n,
        sender: '0x1234567890123456789012345678901234567890',
      };

      const tx = await populateEvmToHubTransfer(params);

      expect(tx).toBeDefined();
      expect(tx.to).toBeDefined();
      expect(tx.data).toBeDefined();
      expect(tx.value).toBeDefined();
    });

    it('should create a populated transaction for Base to Hub', async () => {
      const params = {
        sourceChain: 'base' as const,
        tokenAddress: BASE_CONTRACTS.DYM_WARP,
        recipient: 'dym1abcdefghijklmnopqrstuvwxyz1234567890ab',
        amount: 1000000000000000000n,
        sender: '0x1234567890123456789012345678901234567890',
      };

      const tx = await populateEvmToHubTransfer(params);

      expect(tx).toBeDefined();
    });

    it('should create a populated transaction for BSC to Hub', async () => {
      const params = {
        sourceChain: 'bsc' as const,
        tokenAddress: BSC_CONTRACTS.KAS_WARP,
        recipient: 'dym1abcdefghijklmnopqrstuvwxyz1234567890ab',
        amount: 1000000000000000000n,
        sender: '0x1234567890123456789012345678901234567890',
      };

      const tx = await populateEvmToHubTransfer(params);

      expect(tx).toBeDefined();
    });

    it('should reject invalid recipient addresses', async () => {
      const params = {
        sourceChain: 'ethereum' as const,
        tokenAddress: ETHEREUM_CONTRACTS.ETH_WARP,
        recipient: '0x1234567890123456789012345678901234567890',
        amount: 1000000000000000000n,
        sender: '0x1234567890123456789012345678901234567890',
      };

      await expect(populateEvmToHubTransfer(params)).rejects.toThrow(
        'Recipient must be a Dymension address'
      );
    });

    it('should accept custom RPC URL', async () => {
      const params = {
        sourceChain: 'ethereum' as const,
        tokenAddress: ETHEREUM_CONTRACTS.ETH_WARP,
        recipient: 'dym1abcdefghijklmnopqrstuvwxyz1234567890ab',
        amount: 1000000000000000000n,
        sender: '0x1234567890123456789012345678901234567890',
        rpcUrl: 'https://custom-rpc.example.com',
      };

      const tx = await populateEvmToHubTransfer(params);

      expect(tx).toBeDefined();
    });
  });

  describe('getEvmTokenContract', () => {
    it('should return correct contract for ETH on Ethereum', () => {
      const address = getEvmTokenContract('ethereum', 'ETH');
      expect(address).toBe(ETHEREUM_CONTRACTS.ETH_WARP);
    });

    it('should return correct contract for DYM on Base', () => {
      const address = getEvmTokenContract('base', 'DYM');
      expect(address).toBe(BASE_CONTRACTS.DYM_WARP);
    });

    it('should return correct contract for KAS on BSC', () => {
      const address = getEvmTokenContract('bsc', 'KAS');
      expect(address).toBe(BSC_CONTRACTS.KAS_WARP);
    });

    it('should throw error for unsupported token on chain', () => {
      expect(() => getEvmTokenContract('base', 'ETH')).toThrow(
        'Token ETH not supported on base'
      );
    });
  });

  describe('estimateEvmToHubGas', () => {
    it('should estimate gas for Ethereum to Hub transfer', async () => {
      const gas = await estimateEvmToHubGas('ethereum', ETHEREUM_CONTRACTS.ETH_WARP);

      expect(gas).toBeDefined();
      expect(typeof gas).toBe('bigint');
      expect(gas).toBeGreaterThan(0n);
    });

    it('should estimate gas with custom RPC URL', async () => {
      const gas = await estimateEvmToHubGas(
        'ethereum',
        ETHEREUM_CONTRACTS.ETH_WARP,
        'https://custom-rpc.example.com'
      );

      expect(gas).toBeDefined();
      expect(typeof gas).toBe('bigint');
    });
  });
});
