import { describe, expect, it } from 'vitest';
import {
  calculateEibcWithdrawal,
  calculateEibcSendAmount,
} from '../eibc.js';
import { DEFAULT_EIBC_FEE_PERCENT } from '../index.js';

// Test bridging fee rate (0.1% = 0.001) - in production, fetch via FeeProvider
const TEST_BRIDGING_FEE_RATE = 0.001;

describe('EIBC Fee Calculations', () => {
  describe('calculateEibcWithdrawal', () => {
    it('calculates fees with default EIBC rate (0.15%) and 0.1% bridging', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.eibcFee).toBe(1500n);
      expect(result.bridgingFee).toBe(1000n);
      expect(result.recipientReceives).toBe(997500n);
    });

    it('calculates fees with custom EIBC rate (0.5%)', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(amount, 0.5, TEST_BRIDGING_FEE_RATE);

      expect(result.eibcFee).toBe(5000n);
      expect(result.bridgingFee).toBe(1000n);
      expect(result.recipientReceives).toBe(994000n);
    });

    it('calculates fees with custom bridging rate (0.2%)', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        0.002
      );

      expect(result.eibcFee).toBe(1500n);
      expect(result.bridgingFee).toBe(2000n);
      expect(result.recipientReceives).toBe(996500n);
    });

    it('handles zero amount', () => {
      const amount = 0n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.eibcFee).toBe(0n);
      expect(result.bridgingFee).toBe(0n);
      expect(result.recipientReceives).toBe(0n);
    });

    it('handles large amounts (1 million DYM)', () => {
      const amount = 1_000_000n * 10n ** 18n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      const expectedEibcFee = 1500n * 10n ** 18n;
      const expectedBridgingFee = 1000n * 10n ** 18n;
      const expectedReceived = amount - expectedEibcFee - expectedBridgingFee;

      expect(result.eibcFee).toBe(expectedEibcFee);
      expect(result.bridgingFee).toBe(expectedBridgingFee);
      expect(result.recipientReceives).toBe(expectedReceived);
    });

    it('ensures all fees sum correctly', () => {
      const amounts = [1000000n, 5000000n, 100000000n];

      amounts.forEach((amount) => {
        const result = calculateEibcWithdrawal(
          amount,
          DEFAULT_EIBC_FEE_PERCENT,
          TEST_BRIDGING_FEE_RATE
        );

        const totalFees = result.eibcFee + result.bridgingFee;
        expect(result.recipientReceives).toBe(amount - totalFees);
      });
    });

    it('truncates fees to integer (floors)', () => {
      const amount = 100n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.eibcFee).toBe(0n);
      expect(result.bridgingFee).toBe(0n);
      expect(result.recipientReceives).toBe(100n);
    });

    it('calculates realistic withdrawal scenarios', () => {
      const scenarios = [
        {
          amount: 100_000_000n,
          eibcPercent: 0.15,
          bridgingRate: TEST_BRIDGING_FEE_RATE,
          expectedEibc: 150_000n,
          expectedBridging: 100_000n,
        },
        {
          amount: 1_000_000_000n,
          eibcPercent: 0.5,
          bridgingRate: TEST_BRIDGING_FEE_RATE,
          expectedEibc: 5_000_000n,
          expectedBridging: 1_000_000n,
        },
        {
          amount: 50_000_000_000n,
          eibcPercent: 1.0,
          bridgingRate: TEST_BRIDGING_FEE_RATE,
          expectedEibc: 500_000_000n,
          expectedBridging: 50_000_000n,
        },
      ];

      scenarios.forEach(({ amount, eibcPercent, bridgingRate, expectedEibc, expectedBridging }) => {
        const result = calculateEibcWithdrawal(amount, eibcPercent, bridgingRate);
        expect(result.eibcFee).toBe(expectedEibc);
        expect(result.bridgingFee).toBe(expectedBridging);
        expect(result.recipientReceives).toBe(
          amount - expectedEibc - expectedBridging
        );
      });
    });
  });

  describe('calculateEibcSendAmount', () => {
    it('calculates send amount to achieve desired recipient amount', () => {
      const desired = 997500n;
      const send = calculateEibcSendAmount(
        desired,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      const result = calculateEibcWithdrawal(
        send,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.recipientReceives).toBeGreaterThanOrEqual(desired);
    });

    it('rounds up to ensure desired amount is received', () => {
      const desired = 1000000n;
      const send = calculateEibcSendAmount(
        desired,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(send).toBeGreaterThan(desired);
    });

    it('handles zero desired amount', () => {
      const desired = 0n;
      const send = calculateEibcSendAmount(
        desired,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(send).toBe(0n);
    });

    it('handles custom EIBC fee rates', () => {
      const desired = 990000n;
      const send = calculateEibcSendAmount(desired, 0.5, TEST_BRIDGING_FEE_RATE);

      const result = calculateEibcWithdrawal(send, 0.5, TEST_BRIDGING_FEE_RATE);
      expect(result.recipientReceives).toBeGreaterThanOrEqual(desired);
    });

    it('handles custom bridging fee rates', () => {
      const desired = 995000n;
      const send = calculateEibcSendAmount(
        desired,
        DEFAULT_EIBC_FEE_PERCENT,
        0.002
      );

      const result = calculateEibcWithdrawal(
        send,
        DEFAULT_EIBC_FEE_PERCENT,
        0.002
      );
      expect(result.recipientReceives).toBeGreaterThanOrEqual(desired);
    });

    it('calculates correct send amounts for various desired amounts', () => {
      const desiredAmounts = [
        100_000_000n,
        1_000_000_000n,
        50_000_000_000n,
      ];

      desiredAmounts.forEach((desired) => {
        const send = calculateEibcSendAmount(
          desired,
          DEFAULT_EIBC_FEE_PERCENT,
          TEST_BRIDGING_FEE_RATE
        );
        const result = calculateEibcWithdrawal(
          send,
          DEFAULT_EIBC_FEE_PERCENT,
          TEST_BRIDGING_FEE_RATE
        );
        expect(result.recipientReceives).toBeGreaterThanOrEqual(desired);
      });
    });
  });

  describe('EIBC edge cases', () => {
    it('handles high EIBC fee rates (5%)', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(amount, 5.0, TEST_BRIDGING_FEE_RATE);

      expect(result.eibcFee).toBe(50000n);
      expect(result.bridgingFee).toBe(1000n);
      expect(result.recipientReceives).toBe(949000n);
    });

    it('handles very low EIBC fee rates (0.01%)', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(amount, 0.01, TEST_BRIDGING_FEE_RATE);

      expect(result.eibcFee).toBe(100n);
      expect(result.bridgingFee).toBe(1000n);
      expect(result.recipientReceives).toBe(998900n);
    });

    it('handles combined high fees (5% EIBC + 2% bridging)', () => {
      const amount = 1000000n;
      const result = calculateEibcWithdrawal(amount, 5.0, 0.02);

      expect(result.eibcFee).toBe(50000n);
      expect(result.bridgingFee).toBe(20000n);
      expect(result.recipientReceives).toBe(930000n);
    });

    it('handles small amounts with precision loss', () => {
      const amount = 10n;
      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.eibcFee).toBe(0n);
      expect(result.bridgingFee).toBe(0n);
      expect(result.recipientReceives).toBe(10n);
    });

    it('ensures recipient receives positive amount', () => {
      const amounts = [1000n, 10000n, 100000n, 1000000n];

      amounts.forEach((amount) => {
        const result = calculateEibcWithdrawal(
          amount,
          DEFAULT_EIBC_FEE_PERCENT,
          TEST_BRIDGING_FEE_RATE
        );

        expect(result.recipientReceives).toBeGreaterThan(0n);
        expect(result.recipientReceives).toBeLessThan(amount);
      });
    });

    it('handles maximum safe bigint values', () => {
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER);
      const result = calculateEibcWithdrawal(
        largeAmount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.eibcFee).toBeGreaterThan(0n);
      expect(result.bridgingFee).toBeGreaterThan(0n);
      expect(result.recipientReceives).toBeGreaterThan(0n);
      expect(result.recipientReceives).toBeLessThan(largeAmount);
    });
  });

  describe('EIBC fee formula validation', () => {
    it('validates EIBC fee = amount * eibcFeePercent / 100', () => {
      const amount = 10000000n;
      const eibcPercent = 0.5;

      const result = calculateEibcWithdrawal(amount, eibcPercent, TEST_BRIDGING_FEE_RATE);
      const expectedEibcFee = BigInt(
        Math.floor(Number(amount) * (eibcPercent / 100))
      );

      expect(result.eibcFee).toBe(expectedEibcFee);
    });

    it('validates bridging fee = amount * bridgingFeeRate', () => {
      const amount = 10000000n;
      const bridgingRate = 0.002;

      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        bridgingRate
      );
      const expectedBridgingFee = BigInt(
        Math.floor(Number(amount) * bridgingRate)
      );

      expect(result.bridgingFee).toBe(expectedBridgingFee);
    });

    it('validates recipient = amount - eibcFee - bridgingFee', () => {
      const amount = 10000000n;

      const result = calculateEibcWithdrawal(
        amount,
        DEFAULT_EIBC_FEE_PERCENT,
        TEST_BRIDGING_FEE_RATE
      );

      expect(result.recipientReceives).toBe(
        amount - result.eibcFee - result.bridgingFee
      );
    });
  });
});
