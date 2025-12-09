import { describe, it, expect } from 'vitest';
import {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
  KaspaDepositParams,
} from '../kaspa.js';
import { KASPA, DOMAINS, HUB_TOKEN_IDS } from '../../config/constants.js';

describe('Kaspa Adapter', () => {
  describe('serializeKaspaDepositPayload', () => {
    it('should serialize a valid deposit payload', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 10_000_000_000n,
        network: 'testnet',
      };

      const payload = serializeKaspaDepositPayload(params);

      expect(payload).toBeInstanceOf(Uint8Array);
      expect(payload.length).toBeGreaterThan(77);

      expect(payload[0]).toBe(3);

      const nonceBytes = payload.slice(1, 5);
      const nonce = new DataView(nonceBytes.buffer, nonceBytes.byteOffset, 4).getUint32(0, false);
      expect(nonce).toBe(0);

      const originBytes = payload.slice(5, 9);
      const origin = new DataView(originBytes.buffer, originBytes.byteOffset, 4).getUint32(
        0,
        false
      );
      expect(origin).toBe(DOMAINS.KASPA_TESTNET);

      const sender = Buffer.from(payload.slice(9, 41)).toString('hex');
      expect(sender).toBe('0'.repeat(64));

      const destBytes = payload.slice(41, 45);
      const destination = new DataView(destBytes.buffer, destBytes.byteOffset, 4).getUint32(
        0,
        false
      );
      expect(destination).toBe(DOMAINS.DYMENSION_TESTNET);

      const recipient = '0x' + Buffer.from(payload.slice(45, 77)).toString('hex');
      expect(recipient).toBe(HUB_TOKEN_IDS.KAS);

      const body = payload.slice(77);
      expect(body.length).toBe(64);
    });

    it('should use mainnet domains for mainnet network', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 10_000_000_000n,
        network: 'mainnet',
      };

      const payload = serializeKaspaDepositPayload(params);

      const originBytes = payload.slice(5, 9);
      const origin = new DataView(originBytes.buffer, originBytes.byteOffset, 4).getUint32(
        0,
        false
      );
      expect(origin).toBe(DOMAINS.KASPA_MAINNET);

      const destBytes = payload.slice(41, 45);
      const destination = new DataView(destBytes.buffer, destBytes.byteOffset, 4).getUint32(
        0,
        false
      );
      expect(destination).toBe(DOMAINS.DYMENSION_MAINNET);
    });

    it('should default to mainnet when network not specified', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 10_000_000_000n,
      };

      const payload = serializeKaspaDepositPayload(params);

      const originBytes = payload.slice(5, 9);
      const origin = new DataView(originBytes.buffer, originBytes.byteOffset, 4).getUint32(
        0,
        false
      );
      expect(origin).toBe(DOMAINS.KASPA_MAINNET);
    });

    it('should throw error for deposits below minimum', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 1_000_000_000n,
        network: 'testnet',
      };

      expect(() => serializeKaspaDepositPayload(params)).toThrow(/Minimum deposit/);
    });

    it('should serialize amount correctly in TokenMessage body', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 12_345_678_900_000_000n,
        network: 'testnet',
      };

      const payload = serializeKaspaDepositPayload(params);
      const body = payload.slice(77);

      const amountBytes = body.slice(32, 64);
      let amount = 0n;
      for (let i = 0; i < 32; i++) {
        amount = (amount << 8n) | BigInt(amountBytes[i]);
      }
      expect(amount).toBe(12_345_678_900_000_000n);
    });

    it('should encode recipient correctly in TokenMessage body', () => {
      const params: KaspaDepositParams = {
        hubRecipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 10_000_000_000n,
        network: 'testnet',
      };

      const payload = serializeKaspaDepositPayload(params);
      const body = payload.slice(77);

      const recipientBytes = body.slice(0, 32);
      expect(recipientBytes.length).toBe(32);

      const lastBytes = Array.from(recipientBytes.slice(-20));
      const hasNonZero = lastBytes.some((b) => b !== 0);
      expect(hasNonZero).toBe(true);
    });
  });

  describe('getKaspaEscrowAddress', () => {
    it('should return mainnet escrow address by default', () => {
      const address = getKaspaEscrowAddress();
      expect(address).toBe(KASPA.ESCROW_MAINNET);
    });

    it('should return mainnet escrow address when specified', () => {
      const address = getKaspaEscrowAddress('mainnet');
      expect(address).toBe(KASPA.ESCROW_MAINNET);
    });

    it('should return testnet escrow address when specified', () => {
      const address = getKaspaEscrowAddress('testnet');
      expect(address).toBe(KASPA.ESCROW_TESTNET);
    });

    it('should return valid Kaspa address format', () => {
      const mainnet = getKaspaEscrowAddress('mainnet');
      const testnet = getKaspaEscrowAddress('testnet');

      expect(mainnet).toMatch(/^kaspa:/);
      expect(testnet).toMatch(/^kaspatest:/);
    });
  });

  describe('KASPA constants', () => {
    it('should have correct SOMPI_PER_KAS conversion', () => {
      expect(KASPA.SOMPI_PER_KAS).toBe(100_000_000n);
    });

    it('should have reasonable minimum deposit', () => {
      const minKas = Number(KASPA.MIN_DEPOSIT_SOMPI) / Number(KASPA.SOMPI_PER_KAS);
      expect(minKas).toBeGreaterThan(0);
      expect(minKas).toBeLessThan(1000);
    });

    it('should have valid escrow addresses', () => {
      expect(KASPA.ESCROW_MAINNET).toBeTruthy();
      expect(KASPA.ESCROW_TESTNET).toBeTruthy();
      expect(KASPA.ESCROW_MAINNET).toMatch(/^kaspa:/);
      expect(KASPA.ESCROW_TESTNET).toMatch(/^kaspatest:/);
    });
  });
});
