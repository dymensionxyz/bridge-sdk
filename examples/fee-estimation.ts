/**
 * Example: Fee estimation for various routes
 *
 * Run with: npx ts-node examples/fee-estimation.ts
 */

import {
  createBridgeClient,
  calculateBridgingFee,
  calculateEibcWithdrawal,
  DEFAULT_GAS_AMOUNTS,
  DOMAINS,
} from '../src/index.js';

async function main() {
  const client = createBridgeClient();
  const amount = 10_000_000_000_000_000_000n; // 10 tokens

  console.log('=== Fee Estimation Examples ===\n');

  // 1. Simple bridging fee calculation
  console.log('1. Bridging Fee (2% rate):');
  const bridgingFee = calculateBridgingFee(amount, 0.02);
  console.log(`   Amount: ${amount}`);
  console.log(`   Fee: ${bridgingFee}`);
  console.log(`   Recipient gets: ${amount - bridgingFee}\n`);

  // 2. EIBC withdrawal calculation
  console.log('2. EIBC Withdrawal (0.5% EIBC + 0.1% bridging):');
  const eibc = calculateEibcWithdrawal(amount, 0.5);
  console.log(`   Amount: ${amount}`);
  console.log(`   EIBC fee: ${eibc.eibcFee}`);
  console.log(`   Bridging fee: ${eibc.bridgingFee}`);
  console.log(`   Recipient gets: ${eibc.recipientReceives}\n`);

  // 3. Default gas amounts by destination
  console.log('3. Default Gas Amounts:');
  console.log(`   Ethereum: ${DEFAULT_GAS_AMOUNTS[DOMAINS.ETHEREUM]}`);
  console.log(`   Base: ${DEFAULT_GAS_AMOUNTS[DOMAINS.BASE]}`);
  console.log(`   Solana: ${DEFAULT_GAS_AMOUNTS[DOMAINS.SOLANA_MAINNET]}\n`);

  // 4. Full fee estimation (when implemented)
  console.log('4. Full Fee Estimation (Hub -> Ethereum):');
  try {
    const fees = await client.estimateFees({
      source: 'dymension',
      destination: 'ethereum',
      amount,
    });
    console.log(`   Bridging fee: ${fees.bridgingFee}`);
    console.log(`   IGP fee: ${fees.igpFee}`);
    console.log(`   Total fees: ${fees.totalFees}`);
    console.log(`   Recipient gets: ${fees.recipientReceives}`);
  } catch {
    console.log('   (Not yet implemented)');
  }
}

main().catch(console.error);
