# API Reference

## BridgeClient

The main entry point for the SDK.

### `createBridgeClient(config?)`

Creates a new bridge client instance.

```typescript
import { createBridgeClient } from '@dymension/bridge-sdk';

const client = createBridgeClient();

// With custom config
const client = createBridgeClient({
  rpcUrls: {
    dymension: 'https://my-rpc.com',
  },
});
```

### `client.estimateFees(params)`

Estimate fees for a bridge transfer.

```typescript
const fees = await client.estimateFees({
  source: 'dymension',
  destination: 'ethereum',
  amount: 10_000_000_000_000_000_000n,
});

// Returns:
// {
//   bridgingFee: bigint,
//   igpFee: bigint,
//   totalFees: bigint,
//   recipientReceives: bigint,
// }
```

---

## Adapters

### HubAdapter

For transfers from Dymension Hub to external chains.

```typescript
import { HubAdapter, DOMAINS, HUB_TOKEN_IDS } from '@dymension/bridge-sdk';

const adapter = new HubAdapter({
  tokenId: HUB_TOKEN_IDS.DYM,
});

const tx = await adapter.populateTransferTx({
  destination: DOMAINS.ETHEREUM,
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f...',
  amount: 10_000_000_000_000_000_000n,
  sender: 'dym1...',
  gasAmount: 200_000n,
});
```

### EvmAdapter

For transfers from EVM chains (Ethereum, Base, BSC) to Hub.

```typescript
import { EvmAdapter, DOMAINS, ETHEREUM_CONTRACTS } from '@dymension/bridge-sdk';

const adapter = new EvmAdapter({
  domain: DOMAINS.ETHEREUM,
  tokenAddress: ETHEREUM_CONTRACTS.HYP_DYM,
  routerAddress: ETHEREUM_CONTRACTS.ROUTER,
});

const tx = await adapter.populateTransferTx({
  recipient: 'dym1...',
  amount: 10_000_000_000_000_000_000n,
  gasAmount: 300_000n,
});
```

### SolanaAdapter

For transfers from Solana to Hub.

```typescript
import { SolanaAdapter, DOMAINS } from '@dymension/bridge-sdk';

const adapter = new SolanaAdapter({
  domain: DOMAINS.SOLANA_MAINNET,
  warpRouteAddress: '...',
  mailboxAddress: '...',
});

const result = await adapter.populateTransferTx({
  connection,
  sender: publicKey,
  recipient: 'dym1...',
  amount: 1_000_000_000n,
  gasAmount: 300_000n,
});
```

---

## Fee Utilities

### `calculateBridgingFee(amount, rate)`

Calculate bridging fee for a transfer.

```typescript
import { calculateBridgingFee } from '@dymension/bridge-sdk';

const fee = calculateBridgingFee(10_000_000_000_000_000_000n, 0.02);
// Returns: 200_000_000_000_000_000n (2%)
```

### `calculateEibcWithdrawal(amount, eibcFeePercent)`

Calculate EIBC withdrawal with all fees.

```typescript
import { calculateEibcWithdrawal } from '@dymension/bridge-sdk';

const result = calculateEibcWithdrawal(10_000_000_000_000_000_000n, 0.5);
// Returns: { eibcFee, bridgingFee, recipientReceives }
```

---

## Forward Module

For multi-hop bridging through Dymension Hub.

### `createRollAppToHyperlaneMemo(params)`

Create EIBC memo for RollApp -> Hub -> External chain.

```typescript
import { createRollAppToHyperlaneMemo } from '@dymension/bridge-sdk';

const memo = createRollAppToHyperlaneMemo({
  eibcFee: '50000000000000000',
  transfer: {
    tokenId: HUB_TOKEN_IDS.DYM,
    destinationDomain: DOMAINS.ETHEREUM,
    recipient: '0x000...742d35Cc6634C0532925a3b844Bc9e7595f',
    amount: '10000000000000000000',
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  },
});
```

### `createHLMetadataForIBC(params)`

Create Hyperlane metadata for External -> Hub -> IBC chain.

```typescript
import { createHLMetadataForIBC } from '@dymension/bridge-sdk';

const metadata = createHLMetadataForIBC({
  sourceChannel: 'channel-1',
  token: { denom: 'adym', amount: '1000000' },
  sender: 'dym1...',
  receiver: 'osmo1...',
  timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
});
```

---

## Address Utilities

### `evmAddressToHyperlane(address)`

Convert EVM address to Hyperlane 32-byte format.

```typescript
import { evmAddressToHyperlane } from '@dymension/bridge-sdk';

const bytes32 = evmAddressToHyperlane('0x742d35Cc6634C0532925a3b844Bc9e7595f00000');
// Returns: '0x000000000000000000000000742d35cc6634c0532925a3b844bc9e7595f00000'
```

### `cosmosAddressToHyperlane(address)`

Convert Cosmos bech32 address to Hyperlane format.

```typescript
import { cosmosAddressToHyperlane } from '@dymension/bridge-sdk';

const bytes32 = cosmosAddressToHyperlane('dym1g8sf7w4cz5gtupa6y62h3q6a4gjv37pgefnpt5');
```

### `solanaAddressToHyperlane(address)`

Convert Solana base58 address to Hyperlane format.

```typescript
import { solanaAddressToHyperlane } from '@dymension/bridge-sdk';

const bytes32 = solanaAddressToHyperlane('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
```

---

## Constants

### Domains

```typescript
import { DOMAINS } from '@dymension/bridge-sdk';

DOMAINS.DYMENSION      // 1100
DOMAINS.ETHEREUM       // 1
DOMAINS.BASE           // 8453
DOMAINS.BSC            // 56
DOMAINS.SOLANA_MAINNET // 1399811149
DOMAINS.KASPA          // 111111
```

### Token IDs

```typescript
import { HUB_TOKEN_IDS } from '@dymension/bridge-sdk';

HUB_TOKEN_IDS.DYM    // 'dymension/adym'
HUB_TOKEN_IDS.USDC   // 'ethereum/usdc'
```
