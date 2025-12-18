/**
 * Kaspa → Solana transfer (with Hub forwarding)
 *
 * Creates a Kaspa deposit payload with embedded Hyperlane forwarding metadata.
 * The Hub will automatically forward to Solana upon receiving the deposit.
 *
 * USAGE:
 * 1. Run this script to create the Kaspa deposit payload
 * 2. Use kaspa-sender CLI to broadcast the Kaspa transaction
 * 3. Funds automatically route: Kaspa → Hub → Solana
 */

import 'dotenv/config';
import {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
  getHyperlaneDomain,
  getHubTokenId,
  type Network,
} from '@daniel.dymension.xyz/bridge-sdk';
import { solanaAddressToHyperlane } from '../shared/address.js';
import { env } from '../env.js';

const HUB_RECIPIENT = env('HUB_RECIPIENT');
const SOLANA_RECIPIENT = env('SOLANA_RECIPIENT');
const AMOUNT = env('AMOUNT'); // Amount in sompi (1 KAS = 100,000,000 sompi)
const NETWORK = env('NETWORK') as Network;
const IGP_FEE = env('IGP_FEE');

// Convert Solana address to 32-byte Hyperlane format
const recipientHex = solanaAddressToHyperlane(SOLANA_RECIPIENT);
const solanaDomain = getHyperlaneDomain('solana', NETWORK);
const tokenId = getHubTokenId('KAS');

// Create payload with Hyperlane forwarding metadata
const payload = serializeKaspaDepositPayload({
  hubRecipient: HUB_RECIPIENT,
  amount: BigInt(AMOUNT),
  network: NETWORK,
  forwardToHyperlane: {
    tokenId,
    destinationDomain: solanaDomain,
    recipient: recipientHex,
    amount: AMOUNT,
    maxFee: { denom: 'adym', amount: IGP_FEE },
  },
});

const payloadHex = Buffer.from(payload).toString('hex');
const escrowAddress = getKaspaEscrowAddress(NETWORK);

console.log(JSON.stringify({
  action: 'kaspa_to_solana',
  payload: payloadHex,
  escrow: escrowAddress,
  amount_sompi: AMOUNT,
  hub_recipient: HUB_RECIPIENT,
  solana_recipient: SOLANA_RECIPIENT,
  igp_fee: IGP_FEE,
  network: NETWORK,
}, null, 2));

console.log('\n--- NEXT STEPS ---');
console.log('1. Use kaspa-sender CLI to broadcast this transaction to Kaspa');
console.log('2. Funds will automatically route: Kaspa → Hub → Solana');
