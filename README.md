# Dymension Bridge SDK

Programmatic bridging SDK for Dymension's Hyperlane integration. Enables developers and automated systems to construct bridge transactions without relying on the portal frontend. The SDK helps to construct transactions for dispatching to Dymension, Kaspa, EVM chains or Solana but does not send or sign them.

> **EXPERIMENTAL**: This SDK is in experimental release.

## Repository Structure

```
.
├── sdk/          # The published SDK package for importing in your project
├── examples/     # Examples of importing and using the SDK
```

## Quick Links

- **[SDK README](./sdk/README.md)** - Full SDK documentation and API reference
- **[SDK Docs](https://dymensionxyz.github.io/bridge-sdk/)** - Full SDK documentation and API reference
- **[Examples](./examples/)** - Working examples for all supported routes

## Installation

```bash
npm install @daniel.dymension.xyz/bridge-sdk
```

## Test Status

| Source | Destination | Route Type | Status |
|--------|-------------|------------|--------|
| Hub | Kaspa | Direct | :white_check_mark: (manually tested) |
| Kaspa | Hub | Direct | :white_check_mark: (manually tested) |
| Hub | EVM | Direct | ⚠️ (experimental) |
| Hub | Solana | Direct | ⚠️ (experimental) |
| Hub | IBC (inc rollapp) | Direct | ⚠️ (experimental) |
| EVM | Hub | Direct | ⚠️ (experimental) |
| Solana | Hub | Direct | ⚠️ (experimental) |
| EVM | Hyperlane | Via Hub | ⚠️ (experimental) |
| Solana | Hyperlane | Via Hub | ⚠️ (experimental) |
| Kaspa | Hyperlane | Via Hub | ⚠️ (experimental) |
| IBC | Hyperlane | Via Hub | ⚠️ (experimental) |
| Rollapp | Hyperlane | Via Hub | ⚠️ (experimental) |
| Rollapp | IBC | Via Hub | ⚠️ (experimental) |

**Hyperlane chains**: Ethereum, Base, BSC, Solana, Kaspa

## Quick Start

```typescript
import { createBridgeClient, getHyperlaneDomain, HUB_TOKEN_IDS } from '@daniel.dymension.xyz/bridge-sdk';

// Create client - requires Hub REST URL for fee queries
const client = createBridgeClient({
  restUrls: {
    dymension: 'https://dymension-api.polkachu.com',
  },
});

// High-level transfer API
const result = await client.transfer({
  from: 'dymension',
  to: 'kaspa',
  token: 'KAS',
  amount: 5_000_000_000n, // 50 KAS
  recipient: 'kaspa:qz...',
  sender: 'dym1...',
});

// Sign with CosmJS and broadcast
```

## Development

```bash
# Install dependencies
npm install

# Build SDK
npm run build

# Run tests
npm test
```

## License

MIT
