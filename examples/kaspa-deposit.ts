/**
 * Example: Deposit KAS from Kaspa to Dymension Hub
 *
 * Kaspa has no smart contracts, so we only construct the payload.
 * The user must create the full Kaspa transaction using their wallet.
 *
 * Run with: npx ts-node examples/kaspa-deposit.ts
 */

import {
  serializeKaspaDepositPayload,
  getKaspaEscrowAddress,
  KASPA,
} from '../src/index.js';

async function main() {
  const amount = 500n * KASPA.SOMPI_PER_KAS; // 500 KAS in sompi
  const hubRecipient = 'dym1...'; // Your Hub address

  // Get the escrow address to send to
  const escrowAddress = getKaspaEscrowAddress('mainnet');
  console.log('Send KAS to escrow:', escrowAddress);

  // Create the payload to include in the Kaspa transaction
  const payload = serializeKaspaDepositPayload({
    hubRecipient,
    amount,
    network: 'mainnet',
  });

  console.log('Payload (hex):', Buffer.from(payload).toString('hex'));
  console.log('Payload (array):', Array.from(payload));

  // Now use your Kaspa wallet to send:
  // For KasWare browser extension:
  //
  // await kasware.sendKaspa(escrowAddress, Number(amount), {
  //   payload: Array.from(payload)
  // });

  console.log('\nMinimum deposit:', Number(KASPA.MIN_DEPOSIT_SOMPI) / Number(KASPA.SOMPI_PER_KAS), 'KAS');
}

main().catch(console.error);
