/**
 * EVM → Kaspa transfer via Hyperlane + Hub forwarding
 *
 * Sends tokens from an EVM chain (Ethereum/Base/BSC) to Kaspa
 * via Hyperlane warp routes + Hub's forward module.
 * Uses the high-level transfer() API.
 *
 * Flow: EVM → Hyperlane → Hub → Hyperlane → Kaspa
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { createBridgeClient } from '@daniel.dymension.xyz/bridge-sdk';
import type { ChainName, TokenSymbol } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';

const EVM_PRIVATE_KEY = env('EVM_PRIVATE_KEY');
const HUB_FALLBACK = env('HUB_FALLBACK');
const KASPA_RECIPIENT = env('KASPA_RECIPIENT');
const AMOUNT = env('AMOUNT');
const TOKEN = env('TOKEN') as TokenSymbol;
const SOURCE_CHAIN = env('SOURCE_CHAIN') as ChainName;
const RPC_URL = env('RPC_URL');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(EVM_PRIVATE_KEY, provider);
  const sender = await wallet.getAddress();

  const client = createBridgeClient();

  // Estimate fees for the two-hop transfer
  const fees = await client.estimateFees({
    source: SOURCE_CHAIN,
    destination: 'kaspa',
    amount: BigInt(AMOUNT),
  });

  console.log('Fee estimate:', {
    bridging_fee: fees.bridgingFee.toString(),
    igp_fee: fees.igpFee.toString(),
    recipient_receives: fees.recipientReceives.toString(),
  });

  // Build the transfer transaction using high-level API
  // The SDK automatically handles forwarding metadata construction
  const result = await client.transfer({
    from: SOURCE_CHAIN,
    to: 'kaspa',
    token: TOKEN,
    amount: BigInt(AMOUNT),
    recipient: KASPA_RECIPIENT,
    sender,
    fallbackRecipient: HUB_FALLBACK,
    rpcUrl: RPC_URL,
  });

  console.log(JSON.stringify({
    action: 'evm_to_kaspa_via_hub',
    source_chain: SOURCE_CHAIN,
    token: TOKEN,
    hub_fallback: HUB_FALLBACK,
    kaspa_recipient: KASPA_RECIPIENT,
    amount: AMOUNT,
    route: result.route,
  }));

  // Send the transaction
  const tx = result.tx as ethers.PopulatedTransaction;

  if (isDryRun()) {
    console.log('DRY_RUN: Skipping broadcast');
    console.log(JSON.stringify({ dry_run: true, tx: tx }));
    return;
  }

  const response = await wallet.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: tx.value,
  });

  console.log(JSON.stringify({
    tx_hash: response.hash,
    status: 'pending',
  }));

  // Wait for confirmation
  const receipt = await response.wait();

  console.log(JSON.stringify({
    tx_hash: receipt.transactionHash,
    status: receipt.status === 1 ? 'success' : 'failed',
    block_number: receipt.blockNumber,
    gas_used: receipt.gasUsed.toString(),
  }));

  if (receipt.status !== 1) {
    console.error('Transaction failed');
    process.exit(1);
  }

  console.log('EVM transaction confirmed. Tokens will be forwarded via Hub → Hyperlane → Kaspa.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
