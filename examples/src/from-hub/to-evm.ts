/**
 * Hub -> EVM (Ethereum/Base/BSC) transfer
 *
 * Sends tokens from Dymension Hub to an EVM chain via Hyperlane warp routes.
 * Uses the high-level transfer() API with standard CosmJS signing.
 */

import 'dotenv/config';
import { createBridgeClient, createHyperlaneRegistry } from '@daniel.dymension.xyz/bridge-sdk';
import type { ChainName, TokenSymbol } from '@daniel.dymension.xyz/bridge-sdk';
import { env, isDryRun } from '../env.js';
import { createDymWallet, getSenderAddress, createHubSigningClient, FIXED_FEE } from '../shared/hub-signer.js';

const HUB_MNEMONIC = env('HUB_MNEMONIC');
const EVM_RECIPIENT = env('EVM_RECIPIENT');
const AMOUNT = env('AMOUNT');
const TOKEN = env('TOKEN') as TokenSymbol;
const DESTINATION = env('DESTINATION') as ChainName;
const HUB_RPC = env('HUB_RPC');

async function main() {
  const wallet = await createDymWallet(HUB_MNEMONIC);
  const sender = await getSenderAddress(wallet);

  console.log('Sender address:', sender);

  const client = createBridgeClient();

  // Estimate fees
  const fees = await client.estimateFees({
    source: 'dymension',
    destination: DESTINATION,
    amount: BigInt(AMOUNT),
    token: TOKEN,
  });

  console.log('Fee estimate:', {
    bridging_fee: fees.bridgingFee.toString(),
    igp_fee: fees.igpFee.toString(),
    recipient_receives: fees.recipientReceives.toString(),
  });

  // Build the transfer message using high-level API
  const result = await client.transfer({
    from: 'dymension',
    to: DESTINATION,
    token: TOKEN,
    amount: BigInt(AMOUNT),
    recipient: EVM_RECIPIENT,
    sender,
  });

  console.log(JSON.stringify({
    action: 'hub_to_evm',
    token: TOKEN,
    destination: DESTINATION,
    recipient: EVM_RECIPIENT,
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
