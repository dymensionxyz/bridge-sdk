/**
 * Solana → EVM transfer via Hyperlane + Hub forwarding
 *
 * Sends tokens from Solana to an EVM chain (Ethereum/Base/BSC)
 * via Hyperlane warp routes + Hub's forward module.
 * Uses the high-level transfer() API.
 *
 * Flow: Solana → Hyperlane → Hub → Hyperlane → EVM
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
import type { ChainName, TokenSymbol } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';

const SOLANA_PRIVATE_KEY = env('SOLANA_PRIVATE_KEY');
const HUB_FALLBACK = env('HUB_FALLBACK');
const EVM_RECIPIENT = env('EVM_RECIPIENT');
const AMOUNT = env('AMOUNT');
const TOKEN = env('TOKEN') as TokenSymbol;
const DESTINATION = env('DESTINATION') as ChainName;
const SOLANA_RPC = env('SOLANA_RPC');

async function main() {
  // Decode the base58 private key
  const secretKey = bs58.decode(SOLANA_PRIVATE_KEY);
  const keypair = Keypair.fromSecretKey(secretKey);
  const sender = keypair.publicKey;

  const client = createBridgeClient();

  // Estimate fees for the two-hop transfer
  const fees = await client.estimateFees({
    source: 'solana',
    destination: DESTINATION,
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
    from: 'solana',
    to: DESTINATION,
    token: TOKEN,
    amount: BigInt(AMOUNT),
    recipient: EVM_RECIPIENT,
    sender: sender.toBase58(),
    fallbackRecipient: HUB_FALLBACK,
    rpcUrl: SOLANA_RPC,
  });

  console.log(JSON.stringify({
    action: 'solana_to_evm_via_hub',
    token: TOKEN,
    destination: DESTINATION,
    hub_fallback: HUB_FALLBACK,
    evm_recipient: EVM_RECIPIENT,
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

  console.log('Solana transaction confirmed. Tokens will be forwarded via Hub → Hyperlane → EVM.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
