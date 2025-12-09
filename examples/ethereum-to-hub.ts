/**
 * Example: Bridge from Ethereum to Dymension Hub
 *
 * Run with: npx ts-node examples/ethereum-to-hub.ts
 */

import { populateEvmToHubTransfer, ETHEREUM_CONTRACTS } from '../src/index.js';

async function main() {
  const amount = 10_000_000_000_000_000_000n; // 10 DYM (18 decimals)
  const hubRecipient = 'dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5';
  const senderAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f00000';

  // Create unsigned transaction
  const tx = await populateEvmToHubTransfer({
    sourceChain: 'ethereum',
    tokenAddress: ETHEREUM_CONTRACTS.HYP_DYM,
    recipient: hubRecipient,
    amount,
    sender: senderAddress,
  });

  console.log('Unsigned EVM transaction:');
  console.log('  To:', tx.to);
  console.log('  Data:', tx.data?.slice(0, 66) + '...');
  console.log('  Value:', tx.value?.toString());

  // Now sign with your wallet:
  // const wallet = new ethers.Wallet(privateKey, provider);
  // const signedTx = await wallet.sendTransaction(tx);
  // console.log('Transaction hash:', signedTx.hash);
}

main().catch(console.error);
