# Multi-Hop Forwarding

This document explains how to use the forward module for multi-hop bridging through Dymension Hub.

## Overview

The forward module enables complex bridging routes that pass through Dymension Hub:

- **RollApp -> Hub -> External Chain** (via EIBC)
- **IBC Chain -> Hub -> External Chain** (via IBC completion hooks)
- **External Chain -> Hub -> IBC Chain** (via Hyperlane metadata)
- **External Chain -> Hub -> External Chain** (Hyperlane to Hyperlane)

## Route Types

### 1. RollApp to External Chain (EIBC)

```
RollApp --[IBC + EIBC]--> Hub --[Hyperlane]--> Ethereum
```

Use `createRollAppToHyperlaneMemo()` to construct the IBC memo:

```typescript
import { createRollAppToHyperlaneMemo, HOOK_NAMES } from '@dymension/bridge-sdk';

const memo = createRollAppToHyperlaneMemo({
  eibcFee: '50000000000000000', // 0.05 DYM
  transfer: {
    tokenId: 'dymension/adym',
    destinationDomain: 1, // Ethereum
    recipient: '0x000000000000000000000000742d35cc...', // 32-byte format
    amount: '10000000000000000000',
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  },
});

// Include memo in IBC MsgTransfer
const ibcTx = {
  typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
  value: {
    sourcePort: 'transfer',
    sourceChannel: 'channel-0',
    token: { denom: 'adym', amount: '10050000000000000000' },
    sender: 'rollapp1...',
    receiver: 'dym1...',
    timeoutTimestamp: ...,
    memo: memo,
  },
};
```

### 2. IBC Chain to External Chain

```
Osmosis --[IBC]--> Hub --[Hyperlane]--> Ethereum
```

Use `createIBCToHyperlaneMemo()`:

```typescript
import { createIBCToHyperlaneMemo } from '@dymension/bridge-sdk';

const memo = createIBCToHyperlaneMemo({
  transfer: {
    tokenId: 'dymension/adym',
    destinationDomain: 1,
    recipient: '0x000000000000000000000000742d35cc...',
    amount: '10000000000000000000',
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  },
});
```

### 3. External Chain to IBC Chain

```
Ethereum --[Hyperlane]--> Hub --[IBC]--> Osmosis
```

Use `createHLMetadataForIBC()`:

```typescript
import { createHLMetadataForIBC } from '@dymension/bridge-sdk';

const metadata = createHLMetadataForIBC({
  sourceChannel: 'channel-1', // Hub's channel to Osmosis
  token: { denom: 'adym', amount: '10000000000000000000' },
  sender: 'dym1...', // Hub sender (usually mailbox)
  receiver: 'osmo1...', // Osmosis recipient
  timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
  memo: '', // Optional IBC memo
});

// Include in Hyperlane dispatch call
```

### 4. External Chain to External Chain (via Hub)

```
Ethereum --[Hyperlane]--> Hub --[Hyperlane]--> Base
```

Use `createHLMetadataForHL()`:

```typescript
import { createHLMetadataForHL } from '@dymension/bridge-sdk';

const metadata = createHLMetadataForHL({
  transfer: {
    tokenId: 'dymension/adym',
    destinationDomain: 8453, // Base
    recipient: '0x000000000000000000000000abc123...',
    amount: '10000000000000000000',
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  },
});
```

## Memo Structure

### EIBC Memo (RollApp)

```json
{
  "eibc": {
    "fee": "50000000000000000",
    "dym_on_completion": "<base64(proto(CompletionHookCall))>"
  }
}
```

### IBC Completion Memo (Non-EIBC)

```json
{
  "on_completion": "<base64(proto(CompletionHookCall))>"
}
```

## Protobuf Types

The SDK handles protobuf encoding internally. The key types are:

- `CompletionHookCall` - Wraps the hook name and data
- `HookForwardToHL` - Hyperlane transfer parameters
- `HookForwardToIBC` - IBC transfer parameters (MsgTransfer)
- `HLMetadata` - Hyperlane message metadata

## Example: Full RollApp to Ethereum Flow

```typescript
import {
  createBridgeClient,
  createRollAppToHyperlaneMemo,
  evmAddressToHyperlane,
  calculateEibcWithdrawal,
  DOMAINS,
  HUB_TOKEN_IDS,
} from '@dymension/bridge-sdk';

const client = createBridgeClient();

// 1. Calculate fees
const amount = 10_000_000_000_000_000_000n;
const fees = calculateEibcWithdrawal(amount, 0.5);

// 2. Create forwarding memo
const memo = createRollAppToHyperlaneMemo({
  eibcFee: fees.eibcFee.toString(),
  transfer: {
    tokenId: HUB_TOKEN_IDS.DYM,
    destinationDomain: DOMAINS.ETHEREUM,
    recipient: evmAddressToHyperlane('0x742d35Cc6634C0532925a3b844Bc9e7595f00000'),
    amount: fees.recipientReceives.toString(),
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  },
});

// 3. Create IBC transfer on RollApp with memo
const ibcTx = {
  typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
  value: {
    sourcePort: 'transfer',
    sourceChannel: 'channel-0',
    token: { denom: 'adym', amount: amount.toString() },
    sender: 'rollapp1...',
    receiver: 'dym1...',
    timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
    memo: memo,
  },
};

// 4. Sign and broadcast on RollApp
```
