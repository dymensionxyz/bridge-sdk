# Dymension Bridge SDK Usage Examples

Usage examples for bridging tokens across Dymension's Hyperlane integration.

Uses [@daniel.dymension.xyz/bridge-sdk](https://www.npmjs.com/package/@daniel.dymension.xyz/bridge-sdk) from npm.

## Examples Catalog

### From Kaspa
| Destination | Script | Status |
|-------------|--------|--------|
| Hub | `npm run kaspa:to-hub` | :white_check_mark: |
| Hub -> EVM | `npm run kaspa:to-evm` | :white_circle: |
| Hub -> Solana | `npm run kaspa:to-solana` | :white_circle: |

### From Hub
| Destination | Script | Status |
|-------------|--------|--------|
| Kaspa | `npm run hub:to-kaspa` | :white_check_mark: |
| EVM (Ethereum/Base/BSC) | `npm run hub:to-evm` | :white_circle: |
| Solana | `npm run hub:to-solana` | :white_circle: |

### From EVM (Ethereum/Base/BSC)
| Destination | Script | Status |
|-------------|--------|--------|
| Hub | `npm run evm:to-hub` | :white_circle: |
| Hub -> Kaspa | `npm run evm:to-kaspa` | :white_circle: |
| Hub -> Solana | `npm run evm:to-solana` | :white_circle: |

### From Solana
| Destination | Script | Status |
|-------------|--------|--------|
| Hub | `npm run solana:to-hub` | :white_circle: |
| Hub -> Kaspa | `npm run solana:to-kaspa` | :white_circle: |
| Hub -> EVM | `npm run solana:to-evm` | :white_circle: |

**Legend:** :white_check_mark: Tested | :white_circle: Untested

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your configuration
```

## Prerequisites

- Node.js 18+
- Rust toolchain (for Kaspa sender only)
- Wallets/mnemonics for source chains
- Funds on source chains

## Directory Structure

```
src/
  from-kaspa/     # Kaspa -> Hub, Hub -> EVM/Solana
  from-hub/       # Hub -> Kaspa, EVM, Solana
  from-evm/       # EVM -> Hub, Hub -> Kaspa/Solana
  from-solana/    # Solana -> Hub, Hub -> Kaspa/EVM
  shared/         # Shared utilities
kaspa-sender/     # Rust CLI for sending Kaspa transactions
```

## Kaspa Sender

Kaspa deposits require a Rust CLI tool to send the actual Kaspa transaction. The SDK generates the Hyperlane payload, which you then include in a Kaspa transaction using the `kaspa-sender` tool.

### Building

```bash
cd kaspa-sender
cargo build --release
```

### Usage

```bash
cargo run -- \
  --wallet-secret "your-wallet-password" \
  --amount 5000000000 \
  --payload "03000000..." \
  --escrow "kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh" \
  --network mainnet \
  --rpc "wss://your-kaspa-node:17110"
```

Prerequisites:
- Rust toolchain
- A rusty-kaspa wallet file at `~/.kaspa/` (or use `--wallet-dir`)
- Wallet has sufficient KAS balance

## Configuration

See `.env.example` for all configuration options.

Required environment variables:
- `HUB_RPC_URL`: Dymension Hub RPC endpoint
- `HUB_REST_URL`: Dymension Hub REST/LCD endpoint
- `HUB_MNEMONIC`: Mnemonic for Hub wallet (for Hub-outbound transfers)
- `ETH_PRIVATE_KEY`: Private key for Ethereum wallet
- Chain-specific RPCs as needed
