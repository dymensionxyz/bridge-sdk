/**
 * Kaspa → Hub deposit payload creator
 *
 * Creates the Hyperlane message payload to include in a Kaspa transaction.
 * After running this, use the Rust sender (kaspa-sender) to broadcast the transaction.
 */

import 'dotenv/config';
import {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
} from '@daniel.dymension.xyz/bridge-sdk';
import { env } from '../env.js';

const HUB_RECIPIENT = env('HUB_RECIPIENT');
const AMOUNT = env('AMOUNT'); // Amount in sompi (1 KAS = 100,000,000 sompi)
const NETWORK = env('NETWORK') as 'mainnet' | 'testnet';

const payload = serializeKaspaDepositPayload({
  hubRecipient: HUB_RECIPIENT,
  amount: BigInt(AMOUNT),
  network: NETWORK,
});

const payloadHex = Buffer.from(payload).toString('hex');
const escrowAddress = getKaspaEscrowAddress(NETWORK);

console.log(JSON.stringify({
  payload: payloadHex,
  escrow: escrowAddress,
  amount_sompi: AMOUNT,
  hub_recipient: HUB_RECIPIENT,
  network: NETWORK,
}, null, 2));
