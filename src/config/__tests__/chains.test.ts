/**
 * Tests for chain registry
 */

import { describe, it, expect } from 'vitest';
import {
  CHAINS,
  getChainConfig,
  getHyperlaneDomain,
  getIBCChannelFromHub,
  getIBCChannelToHub,
  isHyperlaneChain,
  isIBCChain,
  getAllChainNames,
  getHyperlaneChainNames,
  getIBCChainNames,
} from '../chains.js';

describe('Chain Registry', () => {
  describe('CHAINS constant', () => {
    it('should have dymension as hub', () => {
      expect(CHAINS.dymension.type).toBe('hub');
      expect(CHAINS.dymension.domain).toBe(1570310961);
      expect(CHAINS.dymension.addressPrefix).toBe('dym');
    });

    it('should have ethereum as hyperlane chain', () => {
      expect(CHAINS.ethereum.type).toBe('hyperlane');
      expect(CHAINS.ethereum.domain).toBe(1);
      expect(CHAINS.ethereum.addressPrefix).toBe('0x');
    });

    it('should have osmosis as IBC chain', () => {
      expect(CHAINS.osmosis.type).toBe('ibc');
      expect(CHAINS.osmosis.channelFromHub).toBe('channel-2');
      expect(CHAINS.osmosis.addressPrefix).toBe('osmo');
    });
  });

  describe('getChainConfig', () => {
    it('should return config for valid chain', () => {
      const config = getChainConfig('ethereum');
      expect(config.displayName).toBe('Ethereum');
      expect(config.type).toBe('hyperlane');
    });

    it('should throw for invalid chain', () => {
      expect(() => getChainConfig('invalid' as never)).toThrow('Unknown chain');
    });
  });

  describe('getHyperlaneDomain', () => {
    it('should return mainnet domain by default', () => {
      expect(getHyperlaneDomain('ethereum')).toBe(1);
      expect(getHyperlaneDomain('dymension')).toBe(1570310961);
      expect(getHyperlaneDomain('kaspa')).toBe(1082673309);
    });

    it('should return testnet domain when specified', () => {
      expect(getHyperlaneDomain('dymension', 'testnet')).toBe(482195613);
      expect(getHyperlaneDomain('kaspa', 'testnet')).toBe(80808082);
      expect(getHyperlaneDomain('solana', 'testnet')).toBe(1399811150);
    });

    it('should throw for IBC chains', () => {
      expect(() => getHyperlaneDomain('osmosis')).toThrow('not a Hyperlane chain');
    });
  });

  describe('getIBCChannelFromHub', () => {
    it('should return channel from Hub to destination', () => {
      expect(getIBCChannelFromHub('osmosis')).toBe('channel-2');
      expect(getIBCChannelFromHub('cosmoshub')).toBe('channel-1');
      expect(getIBCChannelFromHub('celestia')).toBe('channel-4');
      expect(getIBCChannelFromHub('noble')).toBe('channel-6');
    });

    it('should throw for non-IBC chains', () => {
      expect(() => getIBCChannelFromHub('ethereum')).toThrow('not an IBC chain');
    });
  });

  describe('getIBCChannelToHub', () => {
    it('should return channel from source to Hub', () => {
      expect(getIBCChannelToHub('osmosis')).toBe('channel-19774');
      expect(getIBCChannelToHub('cosmoshub')).toBe('channel-794');
    });

    it('should throw for non-IBC chains', () => {
      expect(() => getIBCChannelToHub('kaspa')).toThrow('not an IBC chain');
    });
  });

  describe('isHyperlaneChain', () => {
    it('should return true for Hyperlane chains', () => {
      expect(isHyperlaneChain('ethereum')).toBe(true);
      expect(isHyperlaneChain('base')).toBe(true);
      expect(isHyperlaneChain('solana')).toBe(true);
      expect(isHyperlaneChain('kaspa')).toBe(true);
    });

    it('should return true for hub', () => {
      expect(isHyperlaneChain('dymension')).toBe(true);
    });

    it('should return false for IBC chains', () => {
      expect(isHyperlaneChain('osmosis')).toBe(false);
      expect(isHyperlaneChain('cosmoshub')).toBe(false);
    });
  });

  describe('isIBCChain', () => {
    it('should return true for IBC chains', () => {
      expect(isIBCChain('osmosis')).toBe(true);
      expect(isIBCChain('cosmoshub')).toBe(true);
      expect(isIBCChain('celestia')).toBe(true);
    });

    it('should return false for Hyperlane chains', () => {
      expect(isIBCChain('ethereum')).toBe(false);
      expect(isIBCChain('dymension')).toBe(false);
    });
  });

  describe('chain name helpers', () => {
    it('should return all chain names', () => {
      const names = getAllChainNames();
      expect(names).toContain('ethereum');
      expect(names).toContain('osmosis');
      expect(names).toContain('dymension');
      expect(names.length).toBeGreaterThan(5);
    });

    it('should return only Hyperlane chain names', () => {
      const names = getHyperlaneChainNames();
      expect(names).toContain('ethereum');
      expect(names).toContain('dymension');
      expect(names).not.toContain('osmosis');
    });

    it('should return only IBC chain names', () => {
      const names = getIBCChainNames();
      expect(names).toContain('osmosis');
      expect(names).toContain('cosmoshub');
      expect(names).not.toContain('ethereum');
    });
  });
});
