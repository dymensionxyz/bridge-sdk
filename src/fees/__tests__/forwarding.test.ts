import { describe, it, expect } from 'vitest';
import {
  calculateForwardingFees,
  calculateForwardingSendAmount,
  validateForwardingParams,
  type ForwardingParams,
} from '../forwarding.js';
import { HUB_IGP_HOOKS } from '../../config/constants.js';

describe('Forwarding Fee Calculations', () => {
  describe('calculateForwardingFees', () => {
    it('calculates HL -> Hub -> HL with no inbound fee', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n, // 100 tokens
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0,
        hop2IgpFee: 5n * 10n ** 17n, // 0.5 tokens IGP
        hop2OutboundBridgingFeeRate: 0.001, // 0.1%
      };

      const result = calculateForwardingFees(params);

      // hubBudget = 100 (no inbound fee)
      expect(result.hubBudget).toBe(100n * 10n ** 18n);

      // budgetAfterIgp = 100 - 0.5 = 99.5
      // forwardAmount = budgetAfterIgp / (1 + rate) = 99.5 / 1.001 ≈ 99.4006
      // (forwardAmount + bridgingFee = budgetAfterIgp constraint)
      const budgetAfterIgp = 100n * 10n ** 18n - 5n * 10n ** 17n;
      const ratePrecision = 1_000_000n;
      const rateScaled = 1000n; // 0.001 * 1_000_000
      const expectedForwardAmount = (budgetAfterIgp * ratePrecision) / (ratePrecision + rateScaled);
      expect(result.forwardAmount).toBe(expectedForwardAmount);

      // outboundBridgingFee = forwardAmount * 0.001
      const expectedOutboundFee = (expectedForwardAmount * rateScaled) / ratePrecision;
      expect(result.hop2Fees.outboundBridgingFee).toBe(expectedOutboundFee);

      // maxFee = IGP + bridgingFee (both charged from maxFee)
      expect(result.maxFee).toBe(5n * 10n ** 17n + expectedOutboundFee);

      // recipientReceives = forwardAmount (no deduction - bridging fee comes from maxFee)
      expect(result.recipientReceives).toBe(result.forwardAmount);

      // Verify customHookId and maxFeeDenom
      expect(result.hop2Fees.customHookId).toBe(HUB_IGP_HOOKS.DYM);
      expect(result.hop2Fees.maxFeeDenom).toBe('adym');
    });

    it('calculates HL -> Hub -> HL with inbound bridging fee', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0.001, // 0.1%
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);

      // inboundFee = 100 * 0.001 = 0.1
      expect(result.hop1Fees.inboundBridgingFee).toBe(10n ** 17n);

      // hubBudget = 100 - 0.1 = 99.9
      expect(result.hubBudget).toBe(999n * 10n ** 17n);

      // budgetAfterIgp = 99.9 - 0.5 = 99.4
      // forwardAmount = budgetAfterIgp / (1 + rate) = 99.4 / 1.001 ≈ 99.3007
      const budgetAfterIgp = 999n * 10n ** 17n - 5n * 10n ** 17n;
      const ratePrecision = 1_000_000n;
      const rateScaled = 1000n; // 0.001 * 1_000_000
      const expectedForwardAmount = (budgetAfterIgp * ratePrecision) / (ratePrecision + rateScaled);
      expect(result.forwardAmount).toBe(expectedForwardAmount);

      // recipientReceives = forwardAmount (no deduction)
      expect(result.recipientReceives).toBe(result.forwardAmount);
    });

    it('calculates RollApp -> Hub -> HL with EIBC fees', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'rollapp-hub-hl',
        token: 'DYM',
        eibcFeePercent: 0.5, // 0.5% EIBC
        delayedAckBridgingFeeRate: 0.0015, // 0.15% delayedack
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);

      // eibcFee = 100 * 0.5 / 100 = 0.5 tokens
      expect(result.hop1Fees.eibcFee).toBe(5n * 10n ** 17n);

      // delayedAckFee = 100 * 0.0015 = 0.15 tokens
      expect(result.hop1Fees.delayedAckBridgingFee).toBe(15n * 10n ** 16n);

      // hubBudget = 100 - 0.5 - 0.15 = 99.35
      const expectedBudget = 100n * 10n ** 18n - 5n * 10n ** 17n - 15n * 10n ** 16n;
      expect(result.hubBudget).toBe(expectedBudget);
    });

    it('throws when IGP fee exceeds budget', () => {
      const params: ForwardingParams = {
        amount: 1n * 10n ** 18n, // 1 token
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 2n * 10n ** 18n, // 2 tokens IGP (more than amount!)
        hop2OutboundBridgingFeeRate: 0.001,
      };

      expect(() => calculateForwardingFees(params)).toThrow('Insufficient budget');
    });

    it('calculates total fees correctly', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'rollapp-hub-hl',
        token: 'DYM',
        eibcFeePercent: 0.5,
        delayedAckBridgingFeeRate: 0.0015,
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);

      // Verify: inputAmount - totalFees ≈ recipientReceives (may be off by 1 due to rounding)
      const reconstructedRecipient =
        result.inputAmount - result.totalFeesDeductedFromTransfer;
      // Allow for rounding difference of 1 unit
      const diff =
        reconstructedRecipient > result.recipientReceives
          ? reconstructedRecipient - result.recipientReceives
          : result.recipientReceives - reconstructedRecipient;
      expect(diff).toBeLessThanOrEqual(1n);
    });

    it('handles zero fees correctly for IBC destination (exempt route)', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'hl-hub-ibc', // IBC has no IGP and no inbound fee
        token: 'DYM',
        hop2IgpFee: 0n,
        hop2OutboundBridgingFeeRate: 0,
      };

      const result = calculateForwardingFees(params);

      expect(result.hubBudget).toBe(100n * 10n ** 18n);
      expect(result.forwardAmount).toBe(100n * 10n ** 18n);
      expect(result.maxFee).toBe(0n);
      expect(result.recipientReceives).toBe(100n * 10n ** 18n);
      // IBC route is exempt - no customHookId
      expect(result.hop2Fees.customHookId).toBe('');
    });

    it('handles realistic mainnet scenario', () => {
      // Simulate: 1000 USDC from Ethereum -> Hub -> Solana
      const amount = 1000n * 10n ** 6n; // USDC has 6 decimals
      const params: ForwardingParams = {
        amount,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0.001, // 0.1%
        hop2IgpFee: 500000n, // ~0.5 USDC worth of IGP
        hop2OutboundBridgingFeeRate: 0.001, // 0.1%
      };

      const result = calculateForwardingFees(params);

      // Verify all amounts are positive and make sense
      expect(result.hubBudget).toBeLessThan(amount);
      expect(result.forwardAmount).toBeLessThan(result.hubBudget);
      // In new model: recipientReceives = forwardAmount (bridging fee comes from maxFee)
      expect(result.recipientReceives).toBe(result.forwardAmount);
      expect(result.recipientReceives).toBeGreaterThan(0n);

      // Should receive approximately 1000 - 0.1% inbound - IGP - bridgingFee ≈ 997.5 USDC
      // (bridgingFee now comes from maxFee, so recipient gets more)
      expect(result.recipientReceives).toBeGreaterThan(997n * 10n ** 6n);
      expect(result.recipientReceives).toBeLessThan(999n * 10n ** 6n);
    });

    it('uses KAS-specific IGP hook and denom for KAS transfers', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 8n, // 100 KAS (8 decimals)
        routeType: 'hl-hub-hl',
        token: 'KAS',
        hop2IgpFee: 5n * 10n ** 6n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);

      expect(result.hop2Fees.customHookId).toBe(HUB_IGP_HOOKS.KAS);
      expect(result.hop2Fees.maxFeeDenom).toBe('hyperlane/0x726f757465725f61707000000000000000000000000000020000000000000000');
    });
  });

  describe('calculateForwardingSendAmount', () => {
    it('calculates send amount for desired recipient amount', () => {
      const desiredRecipient = 99n * 10n ** 18n;
      const params: Omit<ForwardingParams, 'amount'> = {
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0.001,
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const sendAmount = calculateForwardingSendAmount(desiredRecipient, params);

      // Verify by calculating forward
      const result = calculateForwardingFees({ ...params, amount: sendAmount });
      expect(result.recipientReceives).toBeGreaterThanOrEqual(desiredRecipient);
    });

    it('rounds up to ensure recipient receives at least desired', () => {
      const desiredRecipient = 100n * 10n ** 18n;
      const params: Omit<ForwardingParams, 'amount'> = {
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const sendAmount = calculateForwardingSendAmount(desiredRecipient, params);
      const result = calculateForwardingFees({ ...params, amount: sendAmount });

      // Recipient should receive at least the desired amount
      expect(result.recipientReceives).toBeGreaterThanOrEqual(desiredRecipient);
    });

    it('handles EIBC route correctly', () => {
      const desiredRecipient = 95n * 10n ** 18n;
      const params: Omit<ForwardingParams, 'amount'> = {
        routeType: 'rollapp-hub-hl',
        token: 'DYM',
        eibcFeePercent: 0.5,
        delayedAckBridgingFeeRate: 0.0015,
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const sendAmount = calculateForwardingSendAmount(desiredRecipient, params);
      const result = calculateForwardingFees({ ...params, amount: sendAmount });

      expect(result.recipientReceives).toBeGreaterThanOrEqual(desiredRecipient);
    });
  });

  describe('validateForwardingParams', () => {
    it('returns null for valid params', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      expect(validateForwardingParams(params)).toBeNull();
    });

    it('returns error for zero amount', () => {
      const params: ForwardingParams = {
        amount: 0n,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      expect(validateForwardingParams(params)).toContain('positive');
    });

    it('returns error for invalid bridging fee rate', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 5n * 10n ** 17n,
        hop2OutboundBridgingFeeRate: 1.5, // > 100%
      };

      expect(validateForwardingParams(params)).toContain('between 0 and 1');
    });

    it('returns error when fees exceed amount', () => {
      const params: ForwardingParams = {
        amount: 1n * 10n ** 18n, // 1 token
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 2n * 10n ** 18n, // 2 tokens (exceeds amount)
        hop2OutboundBridgingFeeRate: 0.001,
      };

      expect(validateForwardingParams(params)).toContain('Insufficient');
    });
  });

  describe('Edge cases', () => {
    it('handles very small amounts with precision loss', () => {
      const params: ForwardingParams = {
        amount: 100n, // Very small
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0.001,
        hop2IgpFee: 10n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);
      expect(result.recipientReceives).toBeGreaterThanOrEqual(0n);
    });

    it('handles maximum bigint values', () => {
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER);
      const params: ForwardingParams = {
        amount: largeAmount,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop2IgpFee: 1000n,
        hop2OutboundBridgingFeeRate: 0.001,
      };

      const result = calculateForwardingFees(params);
      expect(result.recipientReceives).toBeGreaterThan(0n);
      expect(result.recipientReceives).toBeLessThan(largeAmount);
    });

    it('ensures constraint: maxFee + forwardAmount <= hubBudget', () => {
      const params: ForwardingParams = {
        amount: 100n * 10n ** 18n,
        routeType: 'hl-hub-hl',
        token: 'DYM',
        hop1InboundBridgingFeeRate: 0.02, // 2% inbound
        hop2IgpFee: 5n * 10n ** 18n, // Large IGP
        hop2OutboundBridgingFeeRate: 0.02, // 2% outbound
      };

      const result = calculateForwardingFees(params);

      // The key constraint from x/forward
      const maxCost = result.maxFee + result.forwardAmount;
      expect(maxCost).toBeLessThanOrEqual(result.hubBudget);
    });
  });
});
