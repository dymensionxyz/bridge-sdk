/**
 * Tests for memo construction functions
 */

import { describe, it, expect } from 'vitest';
import { fromBase64 } from '@cosmjs/encoding';
import {
  createRollAppToHyperlaneMemo,
  createIBCToHyperlaneMemo,
} from '../memo.js';
import type { RollAppToHyperlaneParams, IBCToHyperlaneParams } from '../types.js';
import { HOOK_NAMES } from '../types.js';
import protobuf from 'protobufjs';

const { Reader } = protobuf;

describe('memo construction', () => {
  describe('createRollAppToHyperlaneMemo', () => {
    it('should create valid EIBC memo with completion hook', () => {
      const params: RollAppToHyperlaneParams = {
        eibcFee: '1000000',
        transfer: {
          tokenId: '0x0000000000000000000000000000000000000001',
          destinationDomain: 1,
          recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e000000000000000000000000',
          amount: '1000000',
          maxFee: {
            denom: 'adym',
            amount: '100000',
          },
        },
      };

      const memo = createRollAppToHyperlaneMemo(params);

      expect(memo).toBeTruthy();
      expect(typeof memo).toBe('string');

      const parsed = JSON.parse(memo);
      expect(parsed).toHaveProperty('eibc');
      expect(parsed.eibc).toHaveProperty('fee', '1000000');
      expect(parsed.eibc).toHaveProperty('dym_on_completion');

      const completionHookBase64 = parsed.eibc.dym_on_completion;
      expect(completionHookBase64).toBeTruthy();

      const completionHookBytes = fromBase64(completionHookBase64);
      expect(completionHookBytes.length).toBeGreaterThan(0);

      const reader = Reader.create(completionHookBytes);
      let hookName = '';
      let hookData: Uint8Array = new Uint8Array();

      while (reader.pos < reader.len) {
        const tag = reader.uint32();
        const field = tag >>> 3;

        switch (field) {
          case 1:
            hookName = reader.string();
            break;
          case 2:
            hookData = reader.bytes();
            break;
          default:
            reader.skipType(tag & 7);
        }
      }

      expect(hookName).toBe(HOOK_NAMES.ROLL_TO_HL);
      expect(hookData.length).toBeGreaterThan(0);
    });

    it('should handle optional fields', () => {
      const params: RollAppToHyperlaneParams = {
        eibcFee: '500000',
        transfer: {
          tokenId: '0x0000000000000000000000000000000000000001',
          destinationDomain: 1,
          recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e000000000000000000000000',
          amount: '1000000',
          maxFee: {
            denom: 'adym',
            amount: '50000',
          },
          gasLimit: '200000',
          customHookId: '0x0000000000000000000000000000000000000002',
          customHookMetadata: '0xabcd',
        },
      };

      const memo = createRollAppToHyperlaneMemo(params);
      expect(memo).toBeTruthy();

      const parsed = JSON.parse(memo);
      expect(parsed.eibc.fee).toBe('500000');
    });
  });

  describe('createIBCToHyperlaneMemo', () => {
    it('should create valid IBC completion memo', () => {
      const params: IBCToHyperlaneParams = {
        transfer: {
          tokenId: '0x0000000000000000000000000000000000000001',
          destinationDomain: 1,
          recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e000000000000000000000000',
          amount: '2000000',
          maxFee: {
            denom: 'uosmo',
            amount: '150000',
          },
        },
      };

      const memo = createIBCToHyperlaneMemo(params);

      expect(memo).toBeTruthy();
      expect(typeof memo).toBe('string');

      const parsed = JSON.parse(memo);
      expect(parsed).toHaveProperty('on_completion');
      expect(parsed).not.toHaveProperty('eibc');

      const completionHookBase64 = parsed.on_completion;
      expect(completionHookBase64).toBeTruthy();

      const completionHookBytes = fromBase64(completionHookBase64);
      expect(completionHookBytes.length).toBeGreaterThan(0);

      const reader = Reader.create(completionHookBytes);
      let hookName = '';

      while (reader.pos < reader.len) {
        const tag = reader.uint32();
        const field = tag >>> 3;

        switch (field) {
          case 1:
            hookName = reader.string();
            break;
          case 2:
            reader.bytes();
            break;
          default:
            reader.skipType(tag & 7);
        }
      }

      expect(hookName).toBe(HOOK_NAMES.ROLL_TO_HL);
    });
  });
});
