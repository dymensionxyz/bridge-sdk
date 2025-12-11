/**
 * Tests for token registry
 */

import { describe, it, expect } from 'vitest';
import {
  TOKENS,
  getToken,
  getTokenAddress,
  getHubTokenId,
  getHubDenom,
  getTokenDecimals,
  isTokenAvailableOnChain,
  getTokensOnChain,
  getAllTokenSymbols,
} from '../tokens.js';

describe('Token Registry', () => {
  describe('TOKENS constant', () => {
    it('should have KAS with correct properties', () => {
      expect(TOKENS.KAS.symbol).toBe('KAS');
      expect(TOKENS.KAS.decimals).toBe(8);
      expect(TOKENS.KAS.addresses.ethereum).toBe('0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF');
    });

    it('should have DYM as native on dymension', () => {
      expect(TOKENS.DYM.symbol).toBe('DYM');
      expect(TOKENS.DYM.hubDenom).toBe('adym');
      expect(TOKENS.DYM.addresses.dymension).toBe('native');
    });

    it('should have ETH with correct hub token ID', () => {
      expect(TOKENS.ETH.hubTokenId).toBe(
        '0x726f757465725f61707000000000000000000000000000020000000000000002'
      );
    });
  });

  describe('getToken', () => {
    it('should return config for valid token', () => {
      const kas = getToken('KAS');
      expect(kas.symbol).toBe('KAS');
      expect(kas.displayName).toBe('Kaspa');
    });

    it('should throw for invalid token', () => {
      expect(() => getToken('INVALID' as never)).toThrow('Unknown token');
    });
  });

  describe('getTokenAddress', () => {
    it('should return mainnet address by default', () => {
      expect(getTokenAddress('KAS', 'ethereum')).toBe(
        '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF'
      );
      expect(getTokenAddress('DYM', 'base')).toBe('0x19CCc0859A26fF815E48aA89820691c306253C5a');
    });

    it('should return testnet address when available', () => {
      expect(getTokenAddress('KAS', 'kaspa', 'testnet')).toBe('native');
    });

    it('should fall back to mainnet if no testnet address', () => {
      expect(getTokenAddress('KAS', 'ethereum', 'testnet')).toBe(
        '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF'
      );
    });

    it('should throw if token not available on chain', () => {
      expect(() => getTokenAddress('ETH', 'solana')).toThrow('not available on chain');
    });
  });

  describe('getHubTokenId', () => {
    it('should return correct hub token IDs', () => {
      expect(getHubTokenId('KAS')).toBe(
        '0x726f757465725f61707000000000000000000000000000020000000000000000'
      );
      expect(getHubTokenId('DYM')).toBe(
        '0x726f757465725f61707000000000000000000000000000010000000000000001'
      );
    });
  });

  describe('getHubDenom', () => {
    it('should return correct hub denoms', () => {
      expect(getHubDenom('DYM')).toBe('adym');
    });
  });

  describe('getTokenDecimals', () => {
    it('should return correct decimals', () => {
      expect(getTokenDecimals('KAS')).toBe(8);
      expect(getTokenDecimals('ETH')).toBe(18);
      expect(getTokenDecimals('DYM')).toBe(18);
      expect(getTokenDecimals('SOL')).toBe(9);
    });
  });

  describe('isTokenAvailableOnChain', () => {
    it('should return true for available tokens', () => {
      expect(isTokenAvailableOnChain('KAS', 'ethereum')).toBe(true);
      expect(isTokenAvailableOnChain('DYM', 'dymension')).toBe(true);
      expect(isTokenAvailableOnChain('SOL', 'solana')).toBe(true);
    });

    it('should return false for unavailable tokens', () => {
      expect(isTokenAvailableOnChain('ETH', 'solana')).toBe(false);
      expect(isTokenAvailableOnChain('SOL', 'ethereum')).toBe(false);
    });

    it('should check testnet availability', () => {
      expect(isTokenAvailableOnChain('KAS', 'kaspa', 'testnet')).toBe(true);
      expect(isTokenAvailableOnChain('SOL', 'solana', 'testnet')).toBe(true);
    });
  });

  describe('getTokensOnChain', () => {
    it('should return tokens available on ethereum', () => {
      const tokens = getTokensOnChain('ethereum');
      expect(tokens).toContain('KAS');
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('DYM');
      expect(tokens).not.toContain('SOL');
    });

    it('should return tokens available on solana', () => {
      const tokens = getTokensOnChain('solana');
      expect(tokens).toContain('SOL');
      expect(tokens).not.toContain('ETH');
      expect(tokens).not.toContain('KAS');
    });
  });

  describe('getAllTokenSymbols', () => {
    it('should return all token symbols', () => {
      const symbols = getAllTokenSymbols();
      expect(symbols).toContain('KAS');
      expect(symbols).toContain('ETH');
      expect(symbols).toContain('DYM');
      expect(symbols).toContain('SOL');
      expect(symbols.length).toBe(4);
    });
  });
});
