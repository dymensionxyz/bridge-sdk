# Changelog

## [0.8.0] - 2024-12-16

### Fixed

- Add missing `dymension` address entry for KAS and ETH tokens in registry
- Correct IGP hook IDs (prefix was `router_app` instead of `router_post_dispatch`)
- Update default REST endpoint from deprecated Blast API to publicnode
- Fix `transferFromHub` to route to correct adapter per destination chain type

## [0.1.0] - 2024-12-10

### Added

- Hub adapter for Hub -> EVM transfers via CosmWasm warp routes
- EVM adapter for EVM -> Hub transfers via Hyperlane transferRemote
- Solana adapter for Solana -> Hub transfers
- Kaspa deposit payload serialization for Kaspa -> Hub bridging
- Forward module for multi-hop routing (EIBC memos, HLMetadata)
- Address conversion utilities (EVM, Cosmos, Solana to Hyperlane format)
- Fee calculation utilities (bridging fees, EIBC fees)
- Comprehensive test suite (129 tests)

### Supported Chains

- Dymension Hub (mainnet/testnet)
- Ethereum
- Base
- BSC
- Solana (mainnet/testnet)
- Kaspa (mainnet/testnet)
