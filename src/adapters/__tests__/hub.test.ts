import { describe, it, expect } from 'vitest';
import { createHubAdapter, HubAdapter, HubTransferParams } from '../hub.js';
import { HUB_TOKEN_IDS, HUB_MAILBOX, DOMAINS } from '../../config/constants.js';

describe('HubAdapter', () => {
  describe('createHubAdapter', () => {
    it('should create a HubAdapter instance', () => {
      const adapter = createHubAdapter();
      expect(adapter).toBeInstanceOf(HubAdapter);
    });
  });

  describe('populateTransferTx', () => {
    it('should create MsgExecuteContract for EVM recipient', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.ETHEREUM,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000_000_000_000n,
        sender: 'dym1abc123def456',
      };

      const msg = adapter.populateTransferTx(params);

      expect(msg.typeUrl).toBe('/cosmwasm.wasm.v1.MsgExecuteContract');
      expect(msg.value.sender).toBe('dym1abc123def456');
      expect(msg.value.contract).toBe(HUB_MAILBOX);
      expect(msg.value.funds).toEqual([]);
      expect(msg.value.msg).toBeInstanceOf(Uint8Array);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer).toBeDefined();
      expect(msgJson.msg_remote_transfer.token_id).toBe(HUB_TOKEN_IDS.DYM);
      expect(msgJson.msg_remote_transfer.destination_domain).toBe(DOMAINS.ETHEREUM);
      expect(msgJson.msg_remote_transfer.recipient).toBe(
        '0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f12345'
      );
      expect(msgJson.msg_remote_transfer.amount).toBe('1000000000000000000');
    });

    it('should create MsgExecuteContract for Kaspa (32-byte hex recipient)', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.KAS,
        destinationDomain: DOMAINS.KASPA_MAINNET,
        recipient: '0x' + 'a'.repeat(64),
        amount: 5_000_000_000n,
        sender: 'dym1xyz789',
      };

      const msg = adapter.populateTransferTx(params);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer.token_id).toBe(HUB_TOKEN_IDS.KAS);
      expect(msgJson.msg_remote_transfer.destination_domain).toBe(DOMAINS.KASPA_MAINNET);
      expect(msgJson.msg_remote_transfer.recipient).toBe('0x' + 'a'.repeat(64));
      expect(msgJson.msg_remote_transfer.amount).toBe('5000000000');
    });

    it('should create MsgExecuteContract for Cosmos bech32 recipient', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.DYMENSION_MAINNET,
        recipient: 'dym139mq752delxv78jvtmwxhasyrycufsvrw4aka9',
        amount: 100_000_000n,
        sender: 'dym1sender123',
      };

      const msg = adapter.populateTransferTx(params);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer.recipient).toMatch(/^0x[0-9a-f]{64}$/);
      expect(msgJson.msg_remote_transfer.recipient.length).toBe(66);
    });

    it('should include optional fields when provided', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.ETH,
        destinationDomain: DOMAINS.BASE,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000_000_000_000n,
        sender: 'dym1sender',
        gasLimit: 200_000n,
        customHookId: '0x' + '1'.repeat(64),
        customHookMetadata: '0xdeadbeef',
        maxFee: { denom: 'adym', amount: '1000000' },
      };

      const msg = adapter.populateTransferTx(params);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer.gas_limit).toBe('200000');
      expect(msgJson.msg_remote_transfer.custom_hook_id).toBe('0x' + '1'.repeat(64));
      expect(msgJson.msg_remote_transfer.custom_hook_metadata).toBe('0xdeadbeef');
      expect(msgJson.msg_remote_transfer.max_fee).toEqual({
        denom: 'adym',
        amount: '1000000',
      });
    });

    it('should not include optional fields when not provided', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.ETHEREUM,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer.gas_limit).toBeUndefined();
      expect(msgJson.msg_remote_transfer.custom_hook_id).toBeUndefined();
      expect(msgJson.msg_remote_transfer.custom_hook_metadata).toBeUndefined();
      expect(msgJson.msg_remote_transfer.max_fee).toBeUndefined();
    });

    it('should handle 32-byte hex without 0x prefix', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.KAS,
        destinationDomain: DOMAINS.KASPA_MAINNET,
        recipient: 'b'.repeat(64),
        amount: 1_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      expect(msgJson.msg_remote_transfer.recipient).toBe('0x' + 'b'.repeat(64));
    });

    it('should throw error for unsupported address format', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.ETHEREUM,
        recipient: 'invalid-address',
        amount: 1_000_000_000n,
        sender: 'dym1sender',
      };

      expect(() => adapter.populateTransferTx(params)).toThrow(
        /Unsupported recipient address format/
      );
    });

    it('should create valid JSON-encoded message bytes', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.ETHEREUM,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      expect(() => {
        JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));
      }).not.toThrow();
    });
  });

  describe('MsgExecuteContract structure', () => {
    it('should have correct typeUrl for CosmWasm execution', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.DYM,
        destinationDomain: DOMAINS.ETHEREUM,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      expect(msg.typeUrl).toBe('/cosmwasm.wasm.v1.MsgExecuteContract');
    });

    it('should use HUB_MAILBOX as contract address', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.ETH,
        destinationDomain: DOMAINS.BSC,
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
        amount: 1_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      expect(msg.value.contract).toBe(HUB_MAILBOX);
    });

    it('should have empty funds array for token transfers', () => {
      const adapter = createHubAdapter();

      const params: HubTransferParams = {
        tokenId: HUB_TOKEN_IDS.KAS,
        destinationDomain: DOMAINS.KASPA_MAINNET,
        recipient: '0x' + 'c'.repeat(64),
        amount: 1_000_000_000n,
        sender: 'dym1sender',
      };

      const msg = adapter.populateTransferTx(params);

      expect(msg.value.funds).toEqual([]);
    });
  });

  describe('Integration with constants', () => {
    it('should work with all HUB_TOKEN_IDS', () => {
      const adapter = createHubAdapter();

      for (const tokenId of Object.values(HUB_TOKEN_IDS)) {
        const params: HubTransferParams = {
          tokenId,
          destinationDomain: DOMAINS.ETHEREUM,
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
          amount: 1_000_000_000n,
          sender: 'dym1sender',
        };

        const msg = adapter.populateTransferTx(params);
        const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));

        expect(msgJson.msg_remote_transfer.token_id).toBe(tokenId);
      }
    });

    it('should work with all supported DOMAINS', () => {
      const adapter = createHubAdapter();

      const supportedDomains = [
        DOMAINS.ETHEREUM,
        DOMAINS.BASE,
        DOMAINS.BSC,
        DOMAINS.SOLANA_MAINNET,
        DOMAINS.KASPA_MAINNET,
      ];

      for (const domain of supportedDomains) {
        const params: HubTransferParams = {
          tokenId: HUB_TOKEN_IDS.DYM,
          destinationDomain: domain,
          recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f12345',
          amount: 1_000_000_000n,
          sender: 'dym1sender',
        };

        const msg = adapter.populateTransferTx(params);
        const msgJson = JSON.parse(Buffer.from(msg.value.msg).toString('utf-8'));

        expect(msgJson.msg_remote_transfer.destination_domain).toBe(domain);
      }
    });
  });
});
