import { describe, expect, it } from 'vitest';
import {
  calculateBridgingFee,
  calculateAmountAfterBridgingFee,
  calculateSendAmountForDesired,
} from '../bridging.js';
import { DEFAULT_BRIDGING_FEE_RATE } from '../index.js';

describe('Bridging Fee Calculations', () => {
  describe('calculateBridgingFee', () => {
    it('calculates fee with default rate (0.1%)', () => {
      const amount = 1000000n;
      const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBe(1000n);
    });

    it('calculates fee with custom rate (1%)', () => {
      const amount = 1000000n;
      const fee = calculateBridgingFee(amount, 0.01);
      expect(fee).toBe(10000n);
    });

    it('calculates fee with custom rate (2%)', () => {
      const amount = 1000000n;
      const fee = calculateBridgingFee(amount, 0.02);
      expect(fee).toBe(20000n);
    });

    it('handles zero amount', () => {
      const amount = 0n;
      const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBe(0n);
    });

    it('handles large amounts (1 million DYM = 1e24 adym)', () => {
      const amount = 1_000_000n * 10n ** 18n;
      const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBe(1000n * 10n ** 18n);
    });

    it('handles small amounts with precision loss', () => {
      const amount = 100n;
      const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBe(0n);
    });

    it('truncates fee to integer (floors)', () => {
      const amount = 999n;
      const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBe(0n);

      const amount2 = 1001n;
      const fee2 = calculateBridgingFee(amount2, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee2).toBe(1n);
    });

    it('calculates correct fees for realistic amounts', () => {
      const amounts = [
        { amount: 100_000_000n, expectedFee: 100_000n },
        { amount: 1_000_000_000n, expectedFee: 1_000_000n },
        { amount: 50_000_000_000n, expectedFee: 50_000_000n },
      ];

      amounts.forEach(({ amount, expectedFee }) => {
        const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
        expect(fee).toBe(expectedFee);
      });
    });
  });

  describe('calculateAmountAfterBridgingFee', () => {
    it('calculates recipient amount after default fee', () => {
      const amount = 1000000n;
      const received = calculateAmountAfterBridgingFee(
        amount,
        DEFAULT_BRIDGING_FEE_RATE
      );
      expect(received).toBe(999000n);
    });

    it('calculates recipient amount after custom fee (2%)', () => {
      const amount = 1000000n;
      const received = calculateAmountAfterBridgingFee(amount, 0.02);
      expect(received).toBe(980000n);
    });

    it('handles zero amount', () => {
      const amount = 0n;
      const received = calculateAmountAfterBridgingFee(
        amount,
        DEFAULT_BRIDGING_FEE_RATE
      );
      expect(received).toBe(0n);
    });

    it('handles large amounts', () => {
      const amount = 1_000_000n * 10n ** 18n;
      const received = calculateAmountAfterBridgingFee(
        amount,
        DEFAULT_BRIDGING_FEE_RATE
      );
      const expectedFee = 1000n * 10n ** 18n;
      expect(received).toBe(amount - expectedFee);
    });

    it('ensures amount minus fee equals received', () => {
      const amounts = [1000000n, 5000000n, 100000000n];

      amounts.forEach((amount) => {
        const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
        const received = calculateAmountAfterBridgingFee(
          amount,
          DEFAULT_BRIDGING_FEE_RATE
        );
        expect(received).toBe(amount - fee);
      });
    });
  });

  describe('calculateSendAmountForDesired', () => {
    it('calculates send amount to achieve desired recipient amount', () => {
      const desired = 999000n;
      const send = calculateSendAmountForDesired(
        desired,
        DEFAULT_BRIDGING_FEE_RATE
      );
      const received = calculateAmountAfterBridgingFee(
        send,
        DEFAULT_BRIDGING_FEE_RATE
      );
      expect(received).toBeGreaterThanOrEqual(desired);
    });

    it('rounds up to ensure desired amount is received', () => {
      const desired = 1000000n;
      const send = calculateSendAmountForDesired(
        desired,
        DEFAULT_BRIDGING_FEE_RATE
      );
      expect(send).toBeGreaterThan(desired);
    });

    it('handles zero desired amount', () => {
      const desired = 0n;
      const send = calculateSendAmountForDesired(
        desired,
        DEFAULT_BRIDGING_FEE_RATE
      );
      expect(send).toBe(0n);
    });

    it('calculates correct send amount for various desired amounts', () => {
      const desiredAmounts = [
        100_000_000n,
        1_000_000_000n,
        50_000_000_000n,
      ];

      desiredAmounts.forEach((desired) => {
        const send = calculateSendAmountForDesired(
          desired,
          DEFAULT_BRIDGING_FEE_RATE
        );
        const received = calculateAmountAfterBridgingFee(
          send,
          DEFAULT_BRIDGING_FEE_RATE
        );
        expect(received).toBeGreaterThanOrEqual(desired);
      });
    });

    it('handles custom fee rates', () => {
      const desired = 980000n;
      const send = calculateSendAmountForDesired(desired, 0.02);
      const received = calculateAmountAfterBridgingFee(send, 0.02);
      expect(received).toBeGreaterThanOrEqual(desired);
    });
  });

  describe('Fee calculation edge cases', () => {
    it('handles very small fee rates (0.01%)', () => {
      const amount = 1000000n;
      const fee = calculateBridgingFee(amount, 0.0001);
      expect(fee).toBe(100n);
    });

    it('handles very large fee rates (10%)', () => {
      const amount = 1000000n;
      const fee = calculateBridgingFee(amount, 0.1);
      expect(fee).toBe(100000n);
    });

    it('handles maximum safe bigint values', () => {
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER);
      const fee = calculateBridgingFee(largeAmount, DEFAULT_BRIDGING_FEE_RATE);
      expect(fee).toBeGreaterThan(0n);
      expect(fee).toBeLessThan(largeAmount);
    });
  });
});
