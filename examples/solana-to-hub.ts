/**
 * Example: Bridge from Solana to Dymension Hub
 *
 * Solana uses partial signing - the SDK creates a transaction with
 * a random keypair for the unique message account, and you sign with
 * your wallet to authorize the transfer.
 *
 * Run with: npx ts-node examples/solana-to-hub.ts
 */

import { buildSolanaToHubTx, SOLANA } from '../src/index.js';

async function main() {
  const amount = 1_000_000_000n; // 1 SOL (9 decimals)
  const hubRecipient = 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5';
  const senderPubkey = 'YourSolanaPubkey...';

  console.log('Solana transfer example:');
  console.log('');
  console.log('// Build the transaction');
  console.log('const tx = await buildSolanaToHubTx({');
  console.log(`  tokenProgramId: '${SOLANA.TOKEN_PROGRAM_ID}',`);
  console.log(`  recipient: '${hubRecipient}',`);
  console.log(`  amount: ${amount}n,`);
  console.log(`  sender: '${senderPubkey}',`);
  console.log('});');
  console.log('');
  console.log('// Sign with wallet and send');
  console.log('// const signedTx = await wallet.signTransaction(tx);');
  console.log('// const signature = await connection.sendRawTransaction(signedTx.serialize());');
  console.log('');
  console.log('The SDK handles:');
  console.log('  - PDA derivation for unique message account');
  console.log('  - Compute budget instructions');
  console.log('  - Partial signing with random keypair');
}

main().catch(console.error);
