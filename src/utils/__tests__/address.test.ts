import { describe, it, expect } from 'vitest';
import {
  evmAddressToHyperlane,
  cosmosAddressToHyperlane,
  solanaAddressToHyperlane,
  kaspaAddressToHyperlane,
  hyperlaneToEvmAddress,
  hyperlaneToCosmosAddress,
  isValidEvmAddress,
  isValidCosmosAddress,
  isValidHyperlaneAddress,
} from '../address.js';

describe('Address Conversion Utilities', () => {
  const EVM_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2';
  const EVM_HYPERLANE = '0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f0beb2';

  const COSMOS_ADDRESS = 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5';

  const SOLANA_ADDRESS = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';

  describe('evmAddressToHyperlane', () => {
    it('converts EVM address to 32-byte format', () => {
      const result = evmAddressToHyperlane(EVM_ADDRESS);
      expect(result).toBe(EVM_HYPERLANE);
    });

    it('handles addresses without 0x prefix', () => {
      const result = evmAddressToHyperlane(EVM_ADDRESS.slice(2));
      expect(result).toBe(EVM_HYPERLANE);
    });

    it('throws on invalid EVM address', () => {
      expect(() => evmAddressToHyperlane('invalid')).toThrow('Invalid EVM address format');
      expect(() => evmAddressToHyperlane('0x123')).toThrow('Invalid EVM address format');
    });

    it('handles mixed case addresses', () => {
      const result = evmAddressToHyperlane(EVM_ADDRESS.toUpperCase());
      expect(result).toBe(EVM_HYPERLANE);
    });
  });

  describe('cosmosAddressToHyperlane', () => {
    it('converts Cosmos address to 32-byte format', () => {
      const result = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length).toBe(66);
    });

    it('produces 32-byte output', () => {
      const result = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const hex = result.slice(2);
      expect(hex.length).toBe(64);
    });

    it('throws on invalid bech32 address', () => {
      expect(() => cosmosAddressToHyperlane('invalid')).toThrow();
    });
  });

  describe('solanaAddressToHyperlane', () => {
    it('converts Solana address to 32-byte format', () => {
      const result = solanaAddressToHyperlane(SOLANA_ADDRESS);
      expect(result).toHaveLength(66);
      expect(result.startsWith('0x')).toBe(true);
    });

    it('produces 32-byte output', () => {
      const result = solanaAddressToHyperlane(SOLANA_ADDRESS);
      const hex = result.slice(2);
      expect(hex.length).toBe(64);
    });

    it('throws on invalid base58 address', () => {
      expect(() => solanaAddressToHyperlane('invalid!!!')).toThrow();
    });

    it('throws on wrong length address', () => {
      expect(() => solanaAddressToHyperlane('111111111')).toThrow('Invalid Solana address: must be 32 bytes');
    });
  });

  describe('hyperlaneToEvmAddress', () => {
    it('extracts EVM address from 32-byte format', () => {
      const result = hyperlaneToEvmAddress(EVM_HYPERLANE);
      expect(result.toLowerCase()).toBe(EVM_ADDRESS.toLowerCase());
    });

    it('handles input without 0x prefix', () => {
      const result = hyperlaneToEvmAddress(EVM_HYPERLANE.slice(2));
      expect(result.toLowerCase()).toBe(EVM_ADDRESS.toLowerCase());
    });

    it('throws on invalid Hyperlane address', () => {
      expect(() => hyperlaneToEvmAddress('invalid')).toThrow('Invalid Hyperlane address format');
      expect(() => hyperlaneToEvmAddress('0x123')).toThrow('Invalid Hyperlane address format');
    });
  });

  describe('hyperlaneToCosmosAddress', () => {
    it('converts 32-byte format to Cosmos address', () => {
      const hyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const result = hyperlaneToCosmosAddress(hyperlane, 'dym');
      expect(result).toBe(COSMOS_ADDRESS);
    });

    it('handles different prefixes', () => {
      const hyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const result = hyperlaneToCosmosAddress(hyperlane, 'cosmos');
      expect(result.startsWith('cosmos1')).toBe(true);
    });

    it('handles input without 0x prefix', () => {
      const hyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const result = hyperlaneToCosmosAddress(hyperlane.slice(2), 'dym');
      expect(result).toBe(COSMOS_ADDRESS);
    });

    it('throws on invalid Hyperlane address', () => {
      expect(() => hyperlaneToCosmosAddress('invalid', 'dym')).toThrow('Invalid Hyperlane address format');
    });
  });

  describe('Round-trip conversions', () => {
    it('EVM: address -> Hyperlane -> address', () => {
      const hyperlane = evmAddressToHyperlane(EVM_ADDRESS);
      const recovered = hyperlaneToEvmAddress(hyperlane);
      expect(recovered.toLowerCase()).toBe(EVM_ADDRESS.toLowerCase());
    });

    it('Cosmos: address -> Hyperlane -> address', () => {
      const hyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const recovered = hyperlaneToCosmosAddress(hyperlane, 'dym');
      expect(recovered).toBe(COSMOS_ADDRESS);
    });

    it('Solana: address -> Hyperlane (one-way)', () => {
      const hyperlane = solanaAddressToHyperlane(SOLANA_ADDRESS);
      expect(isValidHyperlaneAddress(hyperlane)).toBe(true);
    });
  });

  describe('isValidEvmAddress', () => {
    it('validates correct EVM addresses', () => {
      expect(isValidEvmAddress(EVM_ADDRESS)).toBe(true);
      expect(isValidEvmAddress(EVM_ADDRESS.toLowerCase())).toBe(true);
      expect(isValidEvmAddress(EVM_ADDRESS.toUpperCase())).toBe(true);
    });

    it('validates addresses without 0x prefix', () => {
      expect(isValidEvmAddress(EVM_ADDRESS.slice(2))).toBe(true);
    });

    it('rejects invalid EVM addresses', () => {
      expect(isValidEvmAddress('invalid')).toBe(false);
      expect(isValidEvmAddress('0x123')).toBe(false);
      expect(isValidEvmAddress('0xZZZZ35Cc6634C0532925a3b844Bc9e7595f0bEb2')).toBe(false);
    });
  });

  describe('isValidCosmosAddress', () => {
    it('validates correct Cosmos addresses', () => {
      expect(isValidCosmosAddress(COSMOS_ADDRESS)).toBe(true);
    });

    it('rejects invalid Cosmos addresses', () => {
      expect(isValidCosmosAddress('invalid')).toBe(false);
      expect(isValidCosmosAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2')).toBe(false);
      expect(isValidCosmosAddress('dym1invalid')).toBe(false);
    });
  });

  describe('isValidHyperlaneAddress', () => {
    it('validates correct Hyperlane addresses', () => {
      expect(isValidHyperlaneAddress(EVM_HYPERLANE)).toBe(true);
      const cosmosHyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      expect(isValidHyperlaneAddress(cosmosHyperlane)).toBe(true);
    });

    it('validates addresses without 0x prefix', () => {
      expect(isValidHyperlaneAddress(EVM_HYPERLANE.slice(2))).toBe(true);
    });

    it('rejects invalid Hyperlane addresses', () => {
      expect(isValidHyperlaneAddress('invalid')).toBe(false);
      expect(isValidHyperlaneAddress('0x123')).toBe(false);
      expect(isValidHyperlaneAddress(EVM_ADDRESS)).toBe(false);
    });
  });

  describe('kaspaAddressToHyperlane', () => {
    it('converts Kaspa testnet address to 32-byte format', () => {
      // Use the address from the Rust roundtrip test
      const kaspaAddress = 'kaspatest:qzlq49spp66vkjjex0w7z8708f6zteqwr6swy33fmy4za866ne90vhy54uh3j';
      const result = kaspaAddressToHyperlane(kaspaAddress);
      // Verify format
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length).toBe(66); // 0x + 64 hex chars
      // The value can be verified via Rust roundtrip
    });

    it('handles mainnet escrow address', () => {
      // This is the actual mainnet escrow address
      const mainnetAddress = 'kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh';
      const result = kaspaAddressToHyperlane(mainnetAddress);
      expect(result.startsWith('0x')).toBe(true);
      expect(result.length).toBe(66);
    });

    it('throws on invalid prefix', () => {
      expect(() => kaspaAddressToHyperlane('bitcoin:abc123')).toThrow('Invalid Kaspa address prefix');
    });

    it('throws on malformed address', () => {
      expect(() => kaspaAddressToHyperlane('kaspa')).toThrow('expected prefix:data');
      expect(() => kaspaAddressToHyperlane('invalid')).toThrow('expected prefix:data');
    });
  });

  describe('Real mainnet addresses', () => {
    it('handles real Ethereum mainnet address', () => {
      const ethAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
      const hyperlane = evmAddressToHyperlane(ethAddress);
      const recovered = hyperlaneToEvmAddress(hyperlane);
      expect(recovered.toLowerCase()).toBe(ethAddress.toLowerCase());
    });

    it('handles real Dymension address', () => {
      const dymAddress = 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5';
      const hyperlane = cosmosAddressToHyperlane(dymAddress);
      const recovered = hyperlaneToCosmosAddress(hyperlane, 'dym');
      expect(recovered).toBe(dymAddress);
    });

    it('handles prefix conversion for same address data', () => {
      const hyperlane = cosmosAddressToHyperlane(COSMOS_ADDRESS);
      const osmoAddress = hyperlaneToCosmosAddress(hyperlane, 'osmo');
      expect(osmoAddress.startsWith('osmo1')).toBe(true);
      const recoveredDym = hyperlaneToCosmosAddress(hyperlane, 'dym');
      expect(recoveredDym).toBe(COSMOS_ADDRESS);
    });
  });
});
