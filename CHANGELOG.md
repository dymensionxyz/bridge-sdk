# Changelog

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
