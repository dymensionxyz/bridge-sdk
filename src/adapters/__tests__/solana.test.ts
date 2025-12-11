/**
 * Tests for Solana adapter
 */

import { describe, it, expect } from 'vitest';
import {
  buildSolanaToHubTx,
  getSolanaWarpProgramId,
  deriveAssociatedTokenAccount,
} from '../solana.js';
import { PublicKey } from '@solana/web3.js';

describe('Solana Adapter', () => {
  describe('getSolanaWarpProgramId', () => {
    it('should return correct program ID for mainnet SOL', () => {
      const programId = getSolanaWarpProgramId('SOL', 'mainnet');
      expect(programId).toBe('So11111111111111111111111111111111111111112');
    });

    it('should return correct program ID for mainnet USDC', () => {
      const programId = getSolanaWarpProgramId('USDC', 'mainnet');
      expect(programId).toBe('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
    });

    it('should return correct program ID for testnet SOL', () => {
      const programId = getSolanaWarpProgramId('SOL', 'testnet');
      expect(programId).toBe('So11111111111111111111111111111111111111112');
    });
  });

  describe('deriveAssociatedTokenAccount', () => {
    it('should derive ATA correctly', () => {
      const tokenMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
      const owner = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

      const ata = deriveAssociatedTokenAccount(tokenMint, owner);
      expect(ata).toBeInstanceOf(PublicKey);
      expect(ata.toBase58()).toBeTruthy();
    });
  });

  describe('buildSolanaToHubTx', () => {
    // Skip tests that require live RPC - see issue #33 for adding RPC secrets
    it.skip('should build transaction with correct structure', async () => {
      const params = {
        tokenProgramId: 'So11111111111111111111111111111111111111112',
        recipient: 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5',
        amount: 1000000n,
        sender: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'mainnet' as const,
        rpcUrl: 'https://api.mainnet-beta.solana.com',
      };

      const tx = await buildSolanaToHubTx(params);

      expect(tx).toBeDefined();
      expect(tx.instructions).toBeDefined();
      expect(tx.instructions.length).toBeGreaterThan(0);
      expect(tx.feePayer).toBeDefined();
      expect(tx.recentBlockhash).toBeDefined();
    });

    it.skip('should include compute budget instructions', async () => {
      const params = {
        tokenProgramId: 'So11111111111111111111111111111111111111112',
        recipient: 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5',
        amount: 1000000n,
        sender: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        network: 'testnet' as const,
        rpcUrl: 'https://api.testnet.solana.com',
      };

      const tx = await buildSolanaToHubTx(params);

      const computeBudgetInstructions = tx.instructions.filter(
        (ix) => ix.programId.toBase58() === 'ComputeBudget111111111111111111111111111111'
      );

      expect(computeBudgetInstructions.length).toBeGreaterThanOrEqual(2);
    });
  });
});
