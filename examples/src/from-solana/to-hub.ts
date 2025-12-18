/**
 * Solana → Hub transfer via Hyperlane
 *
 * Sends tokens from Solana to Dymension Hub via Hyperlane warp routes.
 * Uses the high-level transfer() API.
 */

import 'dotenv/config';
import {
  Connection,
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import { createBridgeClient } from '@daniel.dymension.xyz/bridge-sdk';
import type { TokenSymbol } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';

const SOLANA_PRIVATE_KEY = env('SOLANA_PRIVATE_KEY');
const HUB_RECIPIENT = env('HUB_RECIPIENT');
const AMOUNT = env('AMOUNT');
const TOKEN = env('TOKEN') as TokenSymbol;
const SOLANA_RPC = env('SOLANA_RPC');
const HUB_REST = env('HUB_REST');

async function main() {
  // Decode the base58 private key
  const secretKey = bs58.decode(SOLANA_PRIVATE_KEY);
  const keypair = Keypair.fromSecretKey(secretKey);
  const sender = keypair.publicKey;

  const client = createBridgeClient({
    restUrls: { dymension: HUB_REST },
  });

  // Estimate fees
  const fees = await client.estimateFees({
    source: 'solana',
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
    from: 'solana',
    to: 'dymension',
    token: TOKEN,
    amount: BigInt(AMOUNT),
    recipient: HUB_RECIPIENT,
    sender: sender.toBase58(),
    rpcUrl: SOLANA_RPC,
  });

  console.log(JSON.stringify({
    action: 'solana_to_hub',
    token: TOKEN,
    hub_recipient: HUB_RECIPIENT,
    amount: AMOUNT,
    sender: sender.toBase58(),
    route: result.route,
  }));

  // Connect and send the transaction
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const tx = result.tx as Transaction;

  if (isDryRun()) {
    console.log('DRY_RUN: Skipping broadcast');
    console.log(JSON.stringify({ dry_run: true, tx: tx }));
    return;
  }

  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [keypair],
    { commitment: 'confirmed' }
  );

  console.log(JSON.stringify({
    tx_signature: signature,
    status: 'confirmed',
  }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
