# Dymension Bridge SDK

Programmatic bridging SDK for Dymension's Hyperlane integration. Enables developers and automated systems to construct bridge transactions without relying on the portal frontend.

> **EXPERIMENTAL**: This SDK is in experimental release.

## Repository Structure

```
.
├── sdk/          # The published SDK package (@daniel.dymension.xyz/bridge-sdk)
├── examples/     # Usage examples
└── README.md     # This file
```

## Quick Links

- **[SDK Documentation](./sdk/README.md)** - Full SDK documentation and API reference
- **[Examples](./examples/)** - Working examples for all supported routes

## Installation

```bash
npm install @daniel.dymension.xyz/bridge-sdk
```

## Test Status

| Source | Destination | Route Type | Status |
|--------|-------------|------------|--------|
| **Hub** | Kaspa | Direct | :white_check_mark: |
| **Kaspa** | Hub | Direct | :white_check_mark: |
| **Hub** | EVM | Direct | :white_circle: |
| **Hub** | Solana | Direct | :white_circle: |
| **EVM** | Hub | Direct | :white_circle: |
| **Solana** | Hub | Direct | :white_circle: |
| **EVM** | Hyperlane | Via Hub | :white_circle: |
| **Solana** | Hyperlane | Via Hub | :white_circle: |
| **Kaspa** | Hyperlane | Via Hub | :white_circle: |

**Hyperlane chains**: Ethereum, Base, BSC, Solana, Kaspa

**Legend:** :white_check_mark: Tested | :white_circle: Untested

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
