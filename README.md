# @dymension/bridge-sdk

Programmatic bridging SDK for Dymension's Hyperlane integration. Enables developers and automated systems to construct bridge transactions without relying on the portal frontend.

> **EXPERIMENTAL**: This SDK is in experimental release. See the test status table below for manually verified routes.

## Test Status

Manual testing status for each transfer route. Routes are marked as they are verified on mainnet.

| Source | Destination | Route Type | Status | Notes |
|--------|-------------|------------|--------|-------|
| **Hub** | EVM (ETH/Base/BSC) | Direct | :white_circle: | |
| **Hub** | Solana | Direct (exempt) | :white_circle: | No IGP fee |
| **Hub** | Kaspa | Direct (exempt) | :white_circle: | No IGP fee |
| **Hub** | IBC (Osmosis/etc) | Direct | :white_circle: | Standard IBC |
| **EVM** | Hub | Direct | :white_circle: | |
| **Solana** | Hub | Direct | :white_circle: | |
| **Kaspa** | Hub | Direct | :white_circle: | Uses Rust CLI |
| **IBC** | Hub | Direct | :white_circle: | Standard IBC |
| **EVM** | EVM | Via Hub | :white_circle: | HL forwarding |
| **EVM** | Solana | Via Hub | :white_circle: | HL forwarding |
| **EVM** | Kaspa | Via Hub | :white_circle: | HL forwarding |
| **EVM** | IBC | Via Hub | :white_circle: | IBC forwarding |
| **Solana** | EVM | Via Hub | :white_circle: | HL forwarding |
| **Solana** | IBC | Via Hub | :white_circle: | IBC forwarding |
| **Solana** | Kaspa | Via Hub | :white_circle: | HL forwarding |
| **Kaspa** | EVM | Via Hub | :white_circle: | HL forwarding |
| **Kaspa** | IBC | Via Hub | :white_circle: | IBC forwarding |
| **Kaspa** | Solana | Via Hub | :white_circle: | HL forwarding |
| **RollApp** | Hub | Direct | :white_circle: | EIBC withdrawal |
| **RollApp** | EVM | Via Hub | :white_circle: | EIBC + HL forward |
| **RollApp** | Solana | Via Hub | :white_circle: | EIBC + HL forward |
| **RollApp** | Kaspa | Via Hub | :white_circle: | EIBC + HL forward |
| **IBC** | EVM | Via Hub | :white_circle: | PFM + HL forward |
| **IBC** | Solana | Via Hub | :white_circle: | PFM + HL forward |
| **IBC** | Kaspa | Via Hub | :white_circle: | PFM + HL forward |

**Legend:** :white_check_mark: Tested | :white_circle: Untested | :x: Known issue

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

### Direct Routes (Hub as source or destination)

| Source | Destination | Method |
|--------|-------------|--------|
| Hub | EVM (Ethereum, Base, BSC) | `populateHubToEvmTx()` or `transfer()` |
| Hub | Solana | `populateHubToSolanaTx()` or `transfer()` |
| Hub | Kaspa | `populateHubToKaspaTx()` or `transfer()` |
| Hub | IBC (Osmosis, Cosmos Hub, etc.) | `transfer()` → MsgTransfer |
| EVM (Ethereum, Base, BSC) | Hub | `populateEvmToHubTx()` or `transfer()` |
| Solana | Hub | `populateSolanaToHubTx()` or `transfer()` |
| Kaspa | Hub | `createKaspaDepositPayload()` |
| IBC chains | Hub | `transfer()` → MsgTransfer |

### Forwarding Routes (via Hub)

Routes where assets traverse Hub with automatic forwarding to the final destination:

| Source | Destination | Method |
|--------|-------------|--------|
| EVM | Any EVM chain | `transfer()` with forwarding metadata |
| EVM | Solana | `transfer()` with forwarding metadata |
| EVM | IBC chains | `transfer()` with IBC forwarding |
| Solana | Any EVM chain | `transfer()` with forwarding metadata |
| Solana | IBC chains | `transfer()` with IBC forwarding |
| RollApp/IBC | Any Hyperlane chain | `createRollAppToEvmMemo()` + MsgTransfer |

### High-Level Transfer API

The `transfer()` method automatically routes based on source/destination:

```typescript
// EVM → Hub (direct)
await client.transfer({ from: 'ethereum', to: 'dymension', token: 'KAS', ... });

// Hub → EVM (direct)
await client.transfer({ from: 'dymension', to: 'base', token: 'DYM', ... });

// Hub → IBC (direct)
await client.transfer({ from: 'dymension', to: 'osmosis', token: 'DYM', ... });

// EVM → EVM (via Hub forwarding)
await client.transfer({ from: 'ethereum', to: 'base', token: 'KAS', ... });

// EVM → IBC (via Hub forwarding)
await client.transfer({ from: 'ethereum', to: 'osmosis', token: 'DYM', ... });
```

### Supported Chains

**Hyperlane chains**: Ethereum, Base, BSC, Solana, Kaspa
**IBC chains**: Osmosis, Cosmos Hub, Celestia, Noble

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

[API Reference](https://dymensionxyz.github.io/bridge-sdk/)

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
