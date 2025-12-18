/**
 * Hub -> Kaspa transfer
 *
 * Sends KAS from Dymension Hub to a Kaspa address via Hyperlane warp routes.
 * Uses the high-level transfer() API.
 */

import 'dotenv/config';
import { createBridgeClient, createHyperlaneRegistry } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';
import { createDymWallet, getSenderAddress, createHubSigningClient, FIXED_FEE } from '../shared/hub-signer.js';

const HUB_MNEMONIC = env('HUB_MNEMONIC');
const KASPA_RECIPIENT = env('KASPA_RECIPIENT');
const AMOUNT = env('AMOUNT');
const HUB_RPC = env('HUB_RPC');
const HUB_REST = env('HUB_REST');

async function main() {
  const wallet = await createDymWallet(HUB_MNEMONIC);
  const sender = await getSenderAddress(wallet);

  console.log('Sender address:', sender);

  const client = createBridgeClient({
    restUrls: { dymension: HUB_REST },
  });

  // Estimate fees (Hub to Kaspa is exempt from IGP)
  const fees = await client.estimateFees({
    source: 'dymension',
    destination: 'kaspa',
    amount: BigInt(AMOUNT),
  });

  console.log('Fee estimate:', {
    bridging_fee: fees.bridgingFee.toString(),
    igp_fee: fees.igpFee.toString(),
    recipient_receives: fees.recipientReceives.toString(),
  });

  // Build the transfer message using high-level API
  // Note: Kaspa bridge only supports KAS token
  const result = await client.transfer({
    from: 'dymension',
    to: 'kaspa',
    token: 'KAS',
    amount: BigInt(AMOUNT),
    recipient: KASPA_RECIPIENT,
    sender,
  });

  console.log(JSON.stringify({
    action: 'hub_to_kaspa',
    kaspa_recipient: KASPA_RECIPIENT,
    amount: AMOUNT,
    route: result.route,
  }));

  // Connect with Hyperlane registry (for MsgRemoteTransfer)
  const registry = createHyperlaneRegistry();
  const cosmClient = await createHubSigningClient(HUB_RPC, wallet, registry);

  const msg = result.tx as { typeUrl: string; value: unknown };

  if (isDryRun()) {
    console.log('DRY_RUN: Skipping broadcast');
    console.log(JSON.stringify({ dry_run: true, msg: msg }));
    return;
  }

  // Use fixed fee (simulation often fails with custom message types)
  const broadcastResult = await cosmClient.signAndBroadcast(sender, [msg], FIXED_FEE);

  console.log(JSON.stringify({
    tx_hash: broadcastResult.transactionHash,
    code: broadcastResult.code,
    gas_used: broadcastResult.gasUsed.toString(),
  }));

  if (broadcastResult.code !== 0) {
    console.error('Transaction failed');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
