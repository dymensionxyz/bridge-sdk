/**
 * Tests for metadata construction functions
 */

import { describe, it, expect } from 'vitest';
import {
  createHLMetadataForIBC,
  createHLMetadataForHL,
} from '../metadata.js';
import type { HLToIBCParams, HLToHLParams } from '../types.js';
import protobuf from 'protobufjs';

const { Reader } = protobuf;

describe('metadata construction', () => {
  describe('createHLMetadataForIBC', () => {
    it('should create valid HLMetadata for IBC forwarding', () => {
      const params: HLToIBCParams = {
        sourceChannel: 'channel-0',
        sender: 'dym1sender...',
        receiver: 'osmo1receiver...',
        token: {
          denom: 'adym',
          amount: '1000000',
        },
        timeoutTimestamp: BigInt(Date.now() + 600000) * BigInt(1000000),
        memo: 'test memo',
      };

      const metadata = createHLMetadataForIBC(params);

      expect(metadata).toBeInstanceOf(Uint8Array);
      expect(metadata.length).toBeGreaterThan(0);

      const reader = Reader.create(metadata);
      let hasHookForwardToIbc = false;

      while (reader.pos < reader.len) {
        const tag = reader.uint32();
        const field = tag >>> 3;

        switch (field) {
          case 1:
            reader.bytes();
            hasHookForwardToIbc = true;
            break;
          case 2:
            reader.bytes();
            break;
          case 3:
            reader.bytes();
            break;
          default:
            reader.skipType(tag & 7);
        }
      }

      expect(hasHookForwardToIbc).toBe(true);
    });

    it('should handle optional timeout height', () => {
      const params: HLToIBCParams = {
        sourceChannel: 'channel-5',
        sender: 'dym1sender...',
        receiver: 'cosmos1receiver...',
        token: {
          denom: 'adym',
          amount: '5000000',
        },
        timeoutHeight: {
          revisionNumber: BigInt(1),
          revisionHeight: BigInt(1000000),
        },
        timeoutTimestamp: BigInt(0),
      };

      const metadata = createHLMetadataForIBC(params);

      expect(metadata).toBeInstanceOf(Uint8Array);
      expect(metadata.length).toBeGreaterThan(0);
    });
  });

  describe('createHLMetadataForHL', () => {
    it('should create valid HLMetadata for Hyperlane forwarding', () => {
      const params: HLToHLParams = {
        transfer: {
          tokenId: '0x0000000000000000000000000000000000000001',
          destinationDomain: 8453,
          recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e000000000000000000000000',
          amount: '3000000',
          maxFee: {
            denom: 'adym',
            amount: '200000',
          },
        },
      };

      const metadata = createHLMetadataForHL(params);

      expect(metadata).toBeInstanceOf(Uint8Array);
      expect(metadata.length).toBeGreaterThan(0);

      const reader = Reader.create(metadata);
      let hasHookForwardToHl = false;

      while (reader.pos < reader.len) {
        const tag = reader.uint32();
        const field = tag >>> 3;

        switch (field) {
          case 1:
            reader.bytes();
            break;
          case 2:
            reader.bytes();
            break;
          case 3:
            reader.bytes();
            hasHookForwardToHl = true;
            break;
          default:
            reader.skipType(tag & 7);
        }
      }

      expect(hasHookForwardToHl).toBe(true);
    });

    it('should handle optional Hyperlane fields', () => {
      const params: HLToHLParams = {
        transfer: {
          tokenId: '0x0000000000000000000000000000000000000001',
          destinationDomain: 42161,
          recipient: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e000000000000000000000000',
          amount: '10000000',
          maxFee: {
            denom: 'adym',
            amount: '500000',
          },
          gasLimit: '300000',
          customHookId: '0x0000000000000000000000000000000000000003',
          customHookMetadata: '0x1234567890',
        },
      };

      const metadata = createHLMetadataForHL(params);

      expect(metadata).toBeInstanceOf(Uint8Array);
      expect(metadata.length).toBeGreaterThan(0);
    });
  });
});
