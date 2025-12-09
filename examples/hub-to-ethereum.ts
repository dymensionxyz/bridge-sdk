/**
 * Example: Bridge from Dymension Hub to Ethereum
 *
 * Run with: npx ts-node examples/hub-to-ethereum.ts
 */

import { createBridgeClient, DOMAINS, HUB_TOKEN_IDS } from '../src/index.js';

async function main() {
  // Create client with defaults (uses mainnet public RPCs)
  const client = createBridgeClient();

  // Or with custom RPC
  // const client = createBridgeClient({
  //   rpcUrls: {
  //     dymension: 'https://my-private-rpc.com',
  //   },
  // });

  // Estimate fees first
  const fees = await client.estimateFees({
    source: 'dymension',
    destination: 'ethereum',
    amount: 10_000_000_000_000_000_000n, // 10 DYM in adym
  });

  console.log('Fee breakdown:');
  console.log(`  Bridging fee: ${fees.bridgingFee}`);
  console.log(`  IGP fee: ${fees.igpFee}`);
  console.log(`  Recipient receives: ${fees.recipientReceives}`);

  // Create unsigned transaction
  const tx = await client.populateHubToEvmTx({
    tokenId: HUB_TOKEN_IDS.DYM,
    destination: DOMAINS.ETHEREUM,
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f00000', // Your ETH address
    amount: 10_000_000_000_000_000_000n,
    sender: 'dym1...', // Your Hub address
  });

  console.log('\nUnsigned transaction:', tx);

  // Now sign with your wallet:
  // const signedTx = await wallet.sign([tx], fee, memo);
  // await client.broadcastTx(signedTx);
}

main().catch(console.error);
