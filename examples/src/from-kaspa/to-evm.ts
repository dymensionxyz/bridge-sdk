/**
 * Kaspa → EVM transfer (with Hub forwarding)
 *
 * Creates a Kaspa deposit payload with embedded Hyperlane forwarding metadata.
 * The Hub will automatically forward to the EVM chain upon receiving the deposit.
 *
 * USAGE:
 * 1. Run this script to create the Kaspa deposit payload
 * 2. Use kaspa-sender CLI to broadcast the Kaspa transaction
 * 3. Funds automatically route: Kaspa → Hub → EVM
 */

import 'dotenv/config';
import {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
  getHyperlaneDomain,
  getHubTokenId,
  type Network,
  type ChainName,
} from '@daniel.dymension.xyz/bridge-sdk';
import { evmAddressToHyperlane } from '../shared/address.js';
import { env } from '../env.js';

const HUB_RECIPIENT = env('HUB_RECIPIENT');
const EVM_RECIPIENT = env('EVM_RECIPIENT');
const AMOUNT = env('AMOUNT'); // Amount in sompi (1 KAS = 100,000,000 sompi)
const DESTINATION = env('DESTINATION') as ChainName;
const NETWORK = env('NETWORK') as Network;
const IGP_FEE = env('IGP_FEE');

// Convert EVM address to 32-byte Hyperlane format
const recipientHex = evmAddressToHyperlane(EVM_RECIPIENT);
const evmDomain = getHyperlaneDomain(DESTINATION, NETWORK);
const tokenId = getHubTokenId('KAS');

// Create payload with Hyperlane forwarding metadata
const payload = serializeKaspaDepositPayload({
  hubRecipient: HUB_RECIPIENT,
  amount: BigInt(AMOUNT),
  network: NETWORK,
  forwardToHyperlane: {
    tokenId,
    destinationDomain: evmDomain,
    recipient: recipientHex,
    amount: AMOUNT,
    maxFee: { denom: 'adym', amount: IGP_FEE },
  },
});

const payloadHex = Buffer.from(payload).toString('hex');
const escrowAddress = getKaspaEscrowAddress(NETWORK);

console.log(JSON.stringify({
  action: 'kaspa_to_evm',
  payload: payloadHex,
  escrow: escrowAddress,
  amount_sompi: AMOUNT,
  hub_recipient: HUB_RECIPIENT,
  evm_recipient: EVM_RECIPIENT,
  destination: DESTINATION,
  igp_fee: IGP_FEE,
  network: NETWORK,
}, null, 2));

console.log('\n--- NEXT STEPS ---');
console.log('1. Use kaspa-sender CLI to broadcast this transaction to Kaspa');
console.log(`2. Funds will automatically route: Kaspa → Hub → ${DESTINATION}`);
