# @daniel.dymension.xyz/bridge-sdk

Programmatic bridging SDK for Dymension's Hyperlane integration. Enables developers and automated systems to construct bridge transactions without relying on the portal frontend.

## Features

- **Multi-chain support**: Dymension Hub, Ethereum, Base, BSC, Solana, Kaspa
- **Unsigned transactions**: Returns transactions ready for signing with any wallet
- **Fee calculation**: Complete fee breakdown for all bridge routes
- **Forwarding support**: Multi-hop routes via Hyperlane
- **TypeScript-first**: Full type safety with exported types

## Installation

```bash
npm install @daniel.dymension.xyz/bridge-sdk
```

## Quick Start

```typescript
import { createBridgeClient, getHyperlaneDomain, HUB_TOKEN_IDS } from '@daniel.dymension.xyz/bridge-sdk';

// Create client - requires Hub REST URL for fee queries
const client = createBridgeClient({
  restUrls: {
    dymension: 'https://dymension-api.polkachu.com',
  },
});

// Estimate fees
const fees = await client.estimateFees({
  source: 'dymension',
  destination: 'ethereum',
  amount: 10_000_000_000_000_000_000n, // 10 DYM
  token: 'DYM',
});

// Create unsigned transaction (Hub -> Ethereum)
const tx = await client.populateHubToEvmTx({
  tokenId: HUB_TOKEN_IDS.DYM,
  token: 'DYM',
  destination: getHyperlaneDomain('ethereum'),
  recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f...',
  amount: 10_000_000_000_000_000_000n,
  sender: 'dym1...',
  igpFee: fees.igpFee,
});

// Sign with your wallet and broadcast
```

## Supported Routes

### Direct Routes (Hub as source or destination)

| Source | Destination | Method |
|--------|-------------|--------|
| Hub | EVM (Ethereum, Base, BSC) | `populateHubToEvmTx()` or `transfer()` |
| Hub | Solana | `populateHubToSolanaTx()` or `transfer()` |
| Hub | Kaspa | `populateHubToKaspaTx()` or `transfer()` |
| EVM (Ethereum, Base, BSC) | Hub | `populateEvmToHubTx()` or `transfer()` |
| Solana | Hub | `populateSolanaToHubTx()` or `transfer()` |
| Kaspa | Hub | `createKaspaDepositPayload()` |

### Forwarding Routes (via Hub)

Routes where assets traverse Hub with automatic forwarding to the final destination:

| Source | Destination | Method |
|--------|-------------|--------|
| EVM | Any EVM chain | `transfer()` with forwarding metadata |
| EVM | Solana | `transfer()` with forwarding metadata |
| EVM | Kaspa | `transfer()` with forwarding metadata |
| Solana | Any EVM chain | `transfer()` with forwarding metadata |
| Solana | Kaspa | `transfer()` with forwarding metadata |

### High-Level Transfer API

The `transfer()` method automatically routes based on source/destination:

```typescript
// EVM -> Hub (direct)
await client.transfer({ from: 'ethereum', to: 'dymension', token: 'KAS', ... });

// Hub -> EVM (direct)
await client.transfer({ from: 'dymension', to: 'base', token: 'DYM', ... });

// Hub -> Kaspa (direct)
await client.transfer({ from: 'dymension', to: 'kaspa', token: 'KAS', ... });

// EVM -> EVM (via Hub forwarding)
await client.transfer({ from: 'ethereum', to: 'base', token: 'KAS', ... });

// EVM -> Kaspa (via Hub forwarding)
await client.transfer({ from: 'ethereum', to: 'kaspa', token: 'KAS', ... });
```

### Supported Chains

**Hyperlane chains**: Ethereum, Base, BSC, Solana, Kaspa

## Configuration

```typescript
// Create client with required Hub REST URL
const client = createBridgeClient({
  restUrls: {
    dymension: 'https://dymension-api.polkachu.com',
  },
  rpcUrls: {
    ethereum: 'https://my-private-eth-node.com',
  },
});

// Use testnet
const client = createBridgeClient({
  network: 'testnet',
  restUrls: {
    dymension: 'https://blumbus-api.your-provider.com',
  },
});
```

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
