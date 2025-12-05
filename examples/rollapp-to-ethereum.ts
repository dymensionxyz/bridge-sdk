/**
 * Example: Bridge from RollApp to Ethereum via EIBC forwarding
 *
 * This demonstrates the multi-hop route:
 * RollApp --[IBC+EIBC]--> Hub --[Hyperlane]--> Ethereum
 */

import {
  createBridgeClient,
  evmAddressToHyperlane,
  DOMAINS,
  HUB_TOKEN_IDS,
} from '@dymension/bridge-sdk';

async function main() {
  const client = createBridgeClient();

  const amount = 10_000_000_000_000_000_000n; // 10 DYM
  const eibcFeePercent = 0.5; // 0.5% EIBC fee to incentivize fulfillers

  // Create the forwarding memo for EIBC
  // This memo goes in the IBC transfer from RollApp
  const memo = client.createRollAppToEvmMemo({
    eibcFeePercent,
    tokenId: HUB_TOKEN_IDS.DYM,
    destinationDomain: DOMAINS.ETHEREUM,
    recipient: evmAddressToHyperlane('0x742d35Cc6634C0532925a3b844Bc9e7595f00000'),
    amount: amount.toString(),
    maxFee: { denom: 'adym', amount: '100000000000000000' }, // 0.1 DYM max HL fee
  });

  console.log('Forwarding memo:', memo);

  // Now construct IBC transfer on RollApp with this memo
  // The total amount should cover: transfer + EIBC fee + Hyperlane fee
  const ibcTx = {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
    value: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-0', // RollApp's channel to Hub
      token: {
        denom: 'adym',
        amount: '10500000000000000000', // Amount + fees
      },
      sender: 'rollapp1...', // Your RollApp address
      receiver: 'dym1...', // Hub intermediary address
      timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
      memo: memo,
    },
  };

  console.log('\nIBC transfer to execute on RollApp:', ibcTx);
}

main().catch(console.error);
