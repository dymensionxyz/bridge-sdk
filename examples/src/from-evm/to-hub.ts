/**
 * EVM → Hub transfer via Hyperlane
 *
 * Sends tokens from an EVM chain (Ethereum/Base/BSC) to Dymension Hub
 * via Hyperlane warp routes. Uses the high-level transfer() API.
 */

import 'dotenv/config';
import { ethers } from 'ethers';
import { createBridgeClient } from '@daniel.dymension.xyz/bridge-sdk';
import type { ChainName, TokenSymbol } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';

const EVM_PRIVATE_KEY = env('EVM_PRIVATE_KEY');
const HUB_RECIPIENT = env('HUB_RECIPIENT');
const AMOUNT = env('AMOUNT');
const TOKEN = env('TOKEN') as TokenSymbol;
const SOURCE_CHAIN = env('SOURCE_CHAIN') as ChainName;
const RPC_URL = env('RPC_URL');

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(EVM_PRIVATE_KEY, provider);
  const sender = await wallet.getAddress();

  const client = createBridgeClient();

  // Estimate fees
  const fees = await client.estimateFees({
    source: SOURCE_CHAIN,
    destination: 'dymension',
    amount: BigInt(AMOUNT),
  });

  console.log('Fee estimate:', {
    bridging_fee: fees.bridgingFee.toString(),
    igp_fee: fees.igpFee.toString(),
    recipient_receives: fees.recipientReceives.toString(),
  });

  // Build the transfer transaction using high-level API
  const result = await client.transfer({
    from: SOURCE_CHAIN,
    to: 'dymension',
    token: TOKEN,
    amount: BigInt(AMOUNT),
    recipient: HUB_RECIPIENT,
    sender,
    rpcUrl: RPC_URL,
  });

  console.log(JSON.stringify({
    action: 'evm_to_hub',
    source_chain: SOURCE_CHAIN,
    token: TOKEN,
    hub_recipient: HUB_RECIPIENT,
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
