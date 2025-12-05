# @dymension/bridge-sdk

Programmatic bridging SDK for Dymension's Hyperlane integration. Enables developers and automated systems to construct bridge transactions without relying on the portal frontend.

## Features

- **Multi-chain support**: Dymension Hub, Ethereum, Base, BSC, Solana, Kaspa
- **Unsigned transactions**: Returns transactions ready for signing with any wallet
- **Fee calculation**: Complete fee breakdown for all bridge routes
- **Forwarding support**: Multi-hop routes via EIBC and Hyperlane
- **TypeScript-first**: Full type safety with exported types

## Installation

```bash
npm install @dymension/bridge-sdk
```

## Quick Start

```typescript
import { createBridgeClient, DOMAINS, HUB_TOKEN_IDS } from '@dymension/bridge-sdk';

// Create client with defaults
const client = createBridgeClient();

// Estimate fees
const fees = await client.estimateFees({
  source: 'dymension',
  destination: 'ethereum',
  amount: 10_000_000_000_000_000_000n, // 10 DYM
});

// Create unsigned transaction (Hub -> Ethereum)
const tx = await client.populateHubToEvmTx({
  tokenId: HUB_TOKEN_IDS.DYM,
  destination: DOMAINS.ETHEREUM,
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f...',
  amount: 10_000_000_000_000_000_000n,
  sender: 'dym1...',
});

// Sign with your wallet and broadcast
```

## Supported Routes

| Source | Destination | Method |
|--------|-------------|--------|
| Dymension Hub | Ethereum, Base, BSC | `populateHubToEvmTx()` |
| Dymension Hub | Solana | `populateHubToSolanaTx()` |
| Dymension Hub | Kaspa | `populateHubToKaspaTx()` |
| Ethereum, Base, BSC | Dymension Hub | `populateEvmToHubTx()` |
| Solana | Dymension Hub | `populateSolanaToHubTx()` |
| Kaspa | Dymension Hub | `createKaspaDepositPayload()` |
| RollApp | Any (via forwarding) | `createRollAppToEvmMemo()` |

## Configuration

```typescript
// Use custom RPC endpoints
const client = createBridgeClient({
  rpcUrls: {
    ethereum: 'https://my-private-eth-node.com',
    dymension: 'https://my-custom-dym-rpc.com',
  },
});

// Use testnet
const client = createBridgeClient({
  network: 'testnet',
});
```

## Documentation

- [API Reference](./docs/api.md)
- [Fee Calculation](./docs/fees.md)
- [Forwarding Guide](./docs/forwarding.md)
- [Examples](./examples/)

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## License

MIT
