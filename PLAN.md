# Programmatic Bridging SDK - Research & Implementation Plan

## Executive Summary

This document outlines a plan to enhance Dymension's existing Hyperlane TypeScript SDK to provide better programmatic bridging capabilities. The goal is to enable developers and automated systems (bots, traders) to construct bridge transactions without relying on the portal frontend.

**Key Finding**: The Dymension fork of `d-hyperlane-monorepo` already contains a comprehensive TypeScript SDK with chain-specific adapters. We should extend this existing SDK rather than create a new package.

---

## Part 1: Current State Analysis

### 1.1 What Already Exists

**Location**: `d-hyperlane-monorepo/typescript/sdk/`

The existing SDK provides:

| Component | Location | Capability |
|-----------|----------|------------|
| `WarpCore` | `/warp/WarpCore.ts` | Main orchestration for transfers |
| `CosmNativeHypCollateralAdapter` | `/token/adapters/CosmosModuleTokenAdapter.ts` | Constructs `MsgRemoteTransferEncodeObject` for Hub |
| `SealevelTokenAdapter` | `/token/adapters/SealevelTokenAdapter.ts` | Constructs Solana transactions |
| `EvmHypSyntheticAdapter` | `/token/adapters/EvmTokenAdapter.ts` | Constructs EVM contract calls |
| `MultiProtocolProvider` | `/providers/MultiProtocolProvider.ts` | Multi-chain provider management |

**The SDK already returns unsigned transactions!**

```typescript
// Example: Hub → Ethereum transfer
const adapter = new CosmNativeHypCollateralAdapter(chainName, multiProvider, { token: tokenId });
const tx: MsgRemoteTransferEncodeObject = await adapter.populateTransferRemoteTx({
  fromAccountOwner: sender,
  destination: 1,  // Ethereum domain
  recipient: ethRecipient,
  weiAmountOrId: amount,
});
// tx can be signed by any CosmJS OfflineSigner
```

### 1.2 What's Missing

1. **Kaspa support** - No adapter for Kaspa deposits (requires payload construction only)
2. **Forward module integration** - No memo/metadata construction for multi-hop routes:
   - RollApp → Hub → Hyperlane (EIBC completion hooks)
   - IBC chain → Hub → Hyperlane (IBC completion hooks)
   - Hyperlane → Hub → IBC (HLMetadata)
   - Hyperlane → Hub → Hyperlane (HLMetadata)
3. **Hardcoded configuration** - Need to add mainnet/testnet constants
4. **Documentation** - No user-facing docs for programmatic usage
5. **Examples** - No standalone examples outside the portal

**Note**: The portal currently only implements basic IBC→IBC forwarding (RollApp→RollApp). The RollApp→Hyperlane flow via `dym_on_completion` hooks is NOT implemented in the portal yet.

---

## Part 2: Why TypeScript & Repository Location

### 2.1 Why TypeScript?

1. **Existing ecosystem**: The Hyperlane SDK is already TypeScript
2. **Portal compatibility**: Same patterns used by `d-portal`
3. **Wallet integration**: CosmJS, ethers.js, @solana/web3.js all TypeScript
4. **User base**: Most integrators (bots, DeFi) use TypeScript/JavaScript

### 2.2 Repository: Extend d-hyperlane-monorepo

**Location**: `d-hyperlane-monorepo/typescript/sdk/`

**Reasons**:
- SDK already exists with proper architecture
- Adapters pattern is extensible
- Types and utilities already defined
- Maintains consistency with upstream Hyperlane
- Avoids duplicate package management

**What we add**:
- Kaspa payload utilities
- Forward module metadata helpers
- Hardcoded configuration (domain IDs, contract addresses, token IDs)
- Documentation and examples

---

## Part 3: How the SDK Works Per Chain

### 3.1 Cosmos (Dymension Hub) - Full Transaction Construction

**Adapter**: `CosmNativeHypCollateralAdapter`

**Output**: `MsgRemoteTransferEncodeObject` (CosmJS EncodeObject)

```typescript
interface MsgRemoteTransferEncodeObject {
  typeUrl: '/hyperlane.warp.v1.MsgRemoteTransfer';
  value: {
    sender: string;
    token_id: string;      // 32-byte hex
    destination_domain: number;
    recipient: string;     // 32-byte hex
    amount: string;
    gas_limit: string;
    max_fee: { denom: string; amount: string };
  };
}
```

**User Flow**:
1. SDK constructs `EncodeObject`
2. User passes to any Cosmos wallet (`OfflineSigner`)
3. Wallet signs via `signDirect()` or `signAmino()`
4. User broadcasts signed tx to RPC

**Example**:
```typescript
import { CosmNativeHypCollateralAdapter } from '@hyperlane-xyz/sdk';

const adapter = new CosmNativeHypCollateralAdapter('dymension', multiProvider, {
  token: '0x726f757465725f61707000000000000000000000000000020000000000000000', // KAS
});

// Get unsigned transaction
const tx = await adapter.populateTransferRemoteTx({
  fromAccountOwner: 'dym1...',
  destination: 1082673309,  // Kaspa domain
  recipient: '0x...',       // Kaspa recipient as bytes32
  weiAmountOrId: 1000000000000000000n,
});

// Sign with any wallet
const signedTx = await signingClient.sign(sender, [tx], fee, memo);
await signingClient.broadcastTx(signedTx);
```

### 3.2 EVM (Ethereum, Base, BSC) - Full Transaction Construction

**Adapter**: `EvmHypSyntheticAdapter`, `EvmHypCollateralAdapter`, `EvmHypNativeAdapter`

**Output**: `PopulatedTransaction` (ethers.js)

```typescript
interface PopulatedTransaction {
  to: string;
  data: string;
  value: bigint;
  gasLimit?: bigint;
}
```

**User Flow**:
1. SDK constructs populated transaction
2. User passes to any EVM wallet (MetaMask, ethers Signer)
3. Wallet signs and broadcasts

**Example**:
```typescript
import { EvmHypSyntheticAdapter } from '@hyperlane-xyz/sdk';

const adapter = new EvmHypSyntheticAdapter('ethereum', multiProvider, {
  token: '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF', // KAS on Ethereum
});

// Get gas quote
const quote = await adapter.quoteTransferRemoteGas(1570310961); // Hub domain

// Get unsigned transaction
const tx = await adapter.populateTransferRemoteTx({
  fromAccountOwner: '0x...',
  destination: 1570310961,
  recipient: '0x...', // Hub recipient as bytes32
  weiAmountOrId: 1000000000000000000n,
  interchainGas: quote,
});

// Sign with any wallet
const txResponse = await signer.sendTransaction(tx);
```

### 3.3 Solana - Full Transaction Construction

**Adapter**: `SealevelHypTokenAdapter` (three variants)

**Location**: `typescript/sdk/src/token/adapters/SealevelTokenAdapter.ts` (866 lines)

**Output**: `Transaction` (@solana/web3.js) - partially signed

**Adapter Variants**:
| Variant | Use Case | Token Type |
|---------|----------|------------|
| `SealevelHypNativeAdapter` | Wrapped SOL | Native lamports |
| `SealevelHypCollateralAdapter` | Escrowed tokens | SPL tokens held in escrow PDA |
| `SealevelHypSyntheticAdapter` | Minted tokens | TOKEN_2022 synthetic tokens |

**Configuration Required**:
```typescript
interface SealevelHypTokenAddresses {
  token: Address;           // SPL token mint address
  warpRouter: Address;      // Warp route program ID
  mailbox: Address;         // Mailbox program address
}
```

**How SDK Constructs Transaction**:

1. **Generates random keypair** - For unique message identification
2. **Builds account list** (10+ accounts with specific ordering):
   - System program, SPL Noop, Token PDA
   - Mailbox program, outbox account, dispatch authority
   - Sender wallet (signer), random wallet (signer)
   - Message storage PDA, IGP accounts
3. **Serializes instruction** - Borsh encoding with 8-byte discriminator
4. **Adds compute budget** - 1,000,000 units (generous for merkle variance)
5. **Adds priority fee** - Dynamic based on recent fees (mainnet only)
6. **Partial signs** - Random wallet signs, sender must sign later

**PDA Seeds Used**:
```
Token PDA:       ['hyperlane_message_recipient', '-', 'handle', '-', 'account_metas']
Dispatch Auth:   ['hyperlane_dispatcher', '-', 'dispatch_authority']
Message Storage: ['hyperlane', '-', 'dispatched_message', '-', <random_wallet>]
Mailbox Outbox:  ['hyperlane', '-', 'outbox']
Escrow Account:  ['hyperlane_token', '-', 'escrow']
Mint Authority:  ['hyperlane_token', '-', 'mint']
```

**Priority Fee Handling**:
- Fetches recent prioritization fees for the token
- Calculates median of non-zero fees × 2 (padding)
- Minimum: 100,000 microlamports
- Only applies to mainnet (returns 0 for testnet)

**User Flow**:
1. SDK constructs transaction with partial signature (random wallet)
2. User adds their signature via wallet (`tx.partialSign(walletKeypair)`)
3. User broadcasts to Solana RPC

**Example**:
```typescript
import { SealevelHypSyntheticAdapter } from '@hyperlane-xyz/sdk';

const adapter = new SealevelHypSyntheticAdapter('solanamainnet', multiProvider, {
  token: 'TOKEN_MINT_ADDRESS',
  warpRouter: 'WARP_PROGRAM_ID',
  mailbox: 'MAILBOX_PROGRAM_ID',
});

// Get gas quote for destination
const quote = await adapter.quoteTransferRemoteGas(1570310961); // Hub domain

// Get partially-signed transaction
const tx = await adapter.populateTransferRemoteTx({
  fromAccountOwner: walletPubkey.toBase58(),
  destination: 1570310961, // Hub domain
  recipient: '0x...', // Hub recipient as bytes32
  weiAmountOrId: 1000000000n,
  interchainGas: quote,
});

// User signs (adds missing signature)
tx.partialSign(walletKeypair);

// Broadcast
const sig = await connection.sendRawTransaction(tx.serialize());
await connection.confirmTransaction(sig);
```

**What's Different from EVM/Cosmos**:
- Two signatures required (random wallet + sender)
- SDK provides partial signature, user adds theirs
- Compute budget must be set explicitly
- Priority fees are dynamic and chain-specific

### 3.4 Kaspa - Payload Construction Only

**Why different**: Kaspa has no smart contracts. The SDK cannot construct a full Kaspa transaction because:
- Kaspa tx requires UTXOs (must query wallet)
- Fee calculation depends on tx mass
- Different wallet APIs (KasWare browser extension)

**Approach**: SDK provides **payload serialization only**

```typescript
// SDK provides:
function serializeKaspaDepositPayload(params: {
  hubDomain: number;
  hubTokenId: string;
  amount: bigint;
  hubRecipient: string;  // bech32 dym1... address
}): Uint8Array;

// User uses this payload with their Kaspa wallet
const payload = serializeKaspaDepositPayload({
  hubDomain: 1570310961,
  hubTokenId: '0x726f757465725f61707000000000000000000000000000020000000000000000',
  amount: 50000000000n,  // 500 KAS in sompi
  hubRecipient: 'dym1...',
});

// User calls wallet API directly
await kasware.sendKaspa(escrowAddress, Number(amount), { payload: Array.from(payload) });
```

**What SDK provides**:
- Payload serialization (Hyperlane message format)
- Address conversion (Cosmos bech32 → bytes32)
- Escrow address constant
- Minimum deposit validation

**What user must handle**:
- UTXO selection (wallet handles this)
- Fee calculation (wallet handles this)
- Transaction signing (wallet handles this)
- Broadcasting (wallet handles this)

---

## Part 4: All Forwarding Flows (Multi-Hop Routes)

The forward module on Dymension Hub enables complex multi-hop routes. Here's a complete summary:

### 4.1 Flow Overview

| Source | Destination | Mechanism | Memo/Metadata Field |
|--------|-------------|-----------|---------------------|
| RollApp | Hyperlane chain | EIBC + CompletionHook | `eibc.dym_on_completion` |
| RollApp | IBC chain | EIBC + CompletionHook | `eibc.dym_on_completion` |
| IBC chain | Hyperlane chain | IBC Completion | `on_completion` |
| IBC chain | IBC chain | IBC Completion | `on_completion` |
| Hyperlane chain | IBC chain | HLMetadata | `hook_forward_to_ibc` |
| Hyperlane chain | Hyperlane chain | HLMetadata | `hook_forward_to_hl` |

### 4.2 RollApp → External (via EIBC)

**Use case**: User on a RollApp wants to bridge to Ethereum/Kaspa/Solana

```
RollApp ──IBC+EIBC──▶ Hub ──Hyperlane──▶ External Chain
                         └── CompletionHook triggers forward
```

**Memo format** (in IBC MsgTransfer):
```json
{
  "eibc": {
    "fee": "100",
    "dym_on_completion": "<base64(CompletionHookCall{name:'dym-fwd-roll-hl', data:proto(HookForwardToHL)})>"
  }
}
```

**Hook names**:
- `dym-fwd-roll-hl` - Forward to Hyperlane
- `dym-fwd-roll-ibc` - Forward to another IBC chain

### 4.3 IBC Chain → External (via IBC Completion)

**Use case**: User on Osmosis/Cosmos Hub wants to bridge to Ethereum

```
Osmosis ──IBC──▶ Dymension Hub ──Hyperlane──▶ Ethereum
                                └── IBC completion hook triggers forward
```

**Memo format** (in IBC MsgTransfer):
```json
{
  "on_completion": "<base64(CompletionHookCall{name:'dym-fwd-roll-hl', data:proto(HookForwardToHL)})>"
}
```

### 4.4 External → IBC Chain (via HLMetadata)

**Use case**: User on Ethereum wants to bridge to Osmosis

```
Ethereum ──Hyperlane──▶ Dymension Hub ──IBC──▶ Osmosis
                                       └── OnHyperlaneMessage hook triggers IBC forward
```

**Metadata format** (in Hyperlane MsgRemoteTransfer metadata field):
```
HLMetadata {
  hook_forward_to_ibc: proto(HookForwardToIBC{
    transfer: MsgTransfer{
      source_channel: "channel-0",
      receiver: "osmo1...",
      timeout_timestamp: ...
    }
  })
}
```

### 4.5 External → External (via Hub as Router)

**Use case**: User on Ethereum wants to bridge to Base (or Kaspa to Ethereum)

```
Ethereum ──Hyperlane──▶ Dymension Hub ──Hyperlane──▶ Base
                                       └── OnHyperlaneMessage hook triggers HL forward
```

**Metadata format**:
```
HLMetadata {
  hook_forward_to_hl: proto(HookForwardToHL{
    hyperlane_transfer: MsgRemoteTransfer{
      token_id: "0x...",
      destination_domain: 8453,  // Base
      recipient: "0x...",
      amount: "...",
      max_fee: {...}
    }
  })
}
```

### 4.6 Protobuf Definitions

**CompletionHookCall** (for IBC-based forwarding):
```protobuf
// From d-dymension/x/common/types/completion_hook.proto
message CompletionHookCall {
  string name = 1;  // "dym-fwd-roll-hl" or "dym-fwd-roll-ibc"
  bytes data = 2;   // Hook-specific protobuf data
}
```

**HookForwardToHL**:
```protobuf
// From d-dymension/x/forward/types/dt.proto
message HookForwardToHL {
  hyperlane.warp.v1.MsgRemoteTransfer hyperlane_transfer = 1;
}
```

**HookForwardToIBC**:
```protobuf
// From d-dymension/x/forward/types/dt.proto
message HookForwardToIBC {
  ibc.applications.transfer.v1.MsgTransfer transfer = 1;
}
```

**HLMetadata** (for Hyperlane-based forwarding):
```protobuf
// From d-dymension/x/forward/types/dt.proto
message HLMetadata {
  bytes hook_forward_to_ibc = 1;  // Optional: forward to IBC
  bytes kaspa = 2;                 // Kaspa-specific (reserved)
  bytes hook_forward_to_hl = 3;   // Optional: forward to another HL chain
}
```

---

## Part 5: Fee Calculation

The SDK must help users calculate all required fees for bridging operations. There are multiple fee types depending on the route.

### 5.1 Fee Types Overview

| Fee Type | When Applied | Calculated By |
|----------|--------------|---------------|
| **Bridging Fee** | Hub outbound Hyperlane transfers | `x/bridgingfee` hook |
| **EIBC Fee** | RollApp → Hub withdrawals | User-specified in memo |
| **IGP Fee** | All Hyperlane transfers | Interchain Gas Paymaster |
| **Cosmos Tx Fee** | Cosmos chain transactions | Standard gas × price |
| **EVM Gas Fee** | EVM chain transactions | Standard gas estimation |
| **Solana Priority Fee** | Solana transactions | Dynamic median calculation |

### 5.2 Bridging Fee (Hub Hyperlane Transfers)

**Source**: `d-dymension/x/bridgingfee/keeper/hook_fee.go`

**Formula**:
```
bridgingFee = transferAmount × OutboundFee
recipientReceives = transferAmount - bridgingFee
```

**Parameters** (per token, configured on-chain):
- `OutboundFee`: Decimal percentage (e.g., `0.02` = 2%)

**SDK Implementation**:
```typescript
export function calculateBridgingFee(
  amount: bigint,
  outboundFeeRate: number  // e.g., 0.02 for 2%
): bigint {
  return BigInt(Math.floor(Number(amount) * outboundFeeRate));
}

// Query current fee rate from chain
export async function getBridgingFeeRate(
  client: QueryClient,
  tokenId: string
): Promise<number> {
  const response = await client.bridgingfee.assetFee({ tokenId });
  return parseFloat(response.outboundFee);
}
```

### 5.3 EIBC Fee (RollApp Withdrawals)

**Source**: `d-dymension/x/eibc/types/fees.go`

**Formula**:
```
eibcFee = userSpecified (in memo)
bridgingFee = amount × BridgingFee (default 0.1%)
demandOrderPrice = amount - eibcFee - bridgingFee
```

**Parameters**:
- `BridgingFee`: Global param (default `0.001` = 0.1%)
- `TimeoutFee`: For timeout packets (default `0.0015` = 0.15%)
- `ErrAckFee`: For error ACK packets (default `0.0015` = 0.15%)

**SDK Implementation**:
```typescript
export function calculateEibcWithdrawal(
  amount: bigint,
  eibcFeePercent: number,     // User-chosen, e.g., 0.5 for 0.5%
  bridgingFeeRate: number = 0.001  // Default 0.1%
): {
  eibcFee: bigint;
  bridgingFee: bigint;
  recipientReceives: bigint;
} {
  const eibcFee = BigInt(Math.floor(Number(amount) * eibcFeePercent / 100));
  const bridgingFee = BigInt(Math.floor(Number(amount) * bridgingFeeRate));
  const recipientReceives = amount - eibcFee - bridgingFee;

  return { eibcFee, bridgingFee, recipientReceives };
}

// Calculate amount to send for desired recipient amount
export function calculateEibcSendAmount(
  desiredRecipientAmount: bigint,
  eibcFeePercent: number,
  bridgingFeeRate: number = 0.001
): bigint {
  // Inverse calculation: amount = desired / (1 - eibcFee% - bridgingFee%)
  const totalFeeRate = (eibcFeePercent / 100) + bridgingFeeRate;
  return BigInt(Math.ceil(Number(desiredRecipientAmount) / (1 - totalFeeRate)));
}
```

### 5.4 Interchain Gas Paymaster (IGP) Fee

**Source**: `d-hyperlane-monorepo/typescript/sdk/src/gas/HyperlaneIgp.ts`

**Formula**:
```
igpFee = quoteGasPayment(destinationDomain, gasAmount)
       = gasAmount × destinationGasPrice × exchangeRate
```

The IGP contract on the origin chain quotes the fee in origin chain native tokens.

**SDK Implementation** (already exists):
```typescript
// Using existing adapter
const igpAdapter = new CwHypIgpAdapter(chainName, multiProvider, { igp: igpAddress });

// Quote gas for destination
const gasQuote = await igpAdapter.quoteGasPayment(
  destinationDomain,
  destinationGasAmount  // Usually ~200,000 for EVM, varies by chain
);

// Returns { amount: bigint, addressOrDenom: string }
```

**Default Gas Amounts by Destination**:
| Destination | Default Gas |
|-------------|-------------|
| Ethereum | 200,000 |
| Base | 200,000 |
| BSC | 200,000 |
| Solana | 400,000 |
| Dymension Hub | 300,000 |

### 5.5 Complete Fee Calculation Examples

**Example 1: Hub → Ethereum (Direct Hyperlane)**
```typescript
async function calculateHubToEthFees(amount: bigint) {
  // 1. Bridging fee (protocol takes ~2%)
  const bridgingFee = calculateBridgingFee(amount, 0.02);

  // 2. IGP fee (gas for Ethereum delivery)
  const igpFee = await igpAdapter.quoteGasPayment(DOMAINS.ETHEREUM, 200_000);

  // 3. Cosmos tx fee (standard)
  const txFee = { amount: '50000', denom: 'adym' };

  return {
    bridgingFee,
    igpFee: igpFee.amount,
    txFee,
    recipientReceives: amount - bridgingFee,
    totalCost: bridgingFee + igpFee.amount + BigInt(txFee.amount),
  };
}
```

**Example 2: RollApp → Ethereum (EIBC + Forward)**
```typescript
async function calculateRollAppToEthFees(amount: bigint, eibcFeePercent: number) {
  // 1. EIBC fee (user-chosen, incentivizes fillers)
  const { eibcFee, bridgingFee: eibcBridgingFee } = calculateEibcWithdrawal(
    amount, eibcFeePercent
  );

  // 2. Amount arriving on Hub after EIBC
  const hubAmount = amount - eibcFee - eibcBridgingFee;

  // 3. Hyperlane bridging fee from Hub
  const hlBridgingFee = calculateBridgingFee(hubAmount, 0.02);

  // 4. IGP fee for Ethereum
  const igpFee = await igpAdapter.quoteGasPayment(DOMAINS.ETHEREUM, 200_000);

  return {
    eibcFee,
    eibcBridgingFee,
    hlBridgingFee,
    igpFee: igpFee.amount,
    recipientReceives: hubAmount - hlBridgingFee,
    totalFees: eibcFee + eibcBridgingFee + hlBridgingFee + igpFee.amount,
  };
}
```

### 5.6 Fee Utility Functions

```typescript
// src/dymension/fees.ts

export const DEFAULT_BRIDGING_FEE_RATE = 0.001;  // 0.1%
export const DEFAULT_EIBC_FEE_PERCENT = 0.15;   // 0.15%

export const DEFAULT_GAS_AMOUNTS: Record<number, number> = {
  [DOMAINS.ETHEREUM]: 200_000,
  [DOMAINS.BASE]: 200_000,
  [DOMAINS.BSC]: 200_000,
  [DOMAINS.SOLANA]: 400_000,
  [DOMAINS.DYMENSION_MAINNET]: 300_000,
};

export interface FeeBreakdown {
  bridgingFee: bigint;
  eibcFee?: bigint;
  igpFee: bigint;
  txFee: bigint;
  totalFees: bigint;
  recipientReceives: bigint;
}

export async function estimateBridgeFees(params: {
  sourceChain: ChainName;
  destinationChain: ChainName;
  amount: bigint;
  eibcFeePercent?: number;  // Only for RollApp source
}): Promise<FeeBreakdown> {
  // Implementation varies by route type
  // ...
}
```

---

## Part 6: Configuration & Hardcoded Values

### 6.1 Approach: Defaults with Overrides

We provide sensible defaults but allow users to override everything. This pattern:
- Works out of the box for common use cases
- Allows power users to customize (custom RPCs, private nodes)
- Uses publicly known values from the Hyperlane Registry

### 6.2 Default RPC Endpoints

**Source**: `d-hyperlane-registry/chains/*/metadata.yaml`

```typescript
// src/dymension/rpc.ts

export const DEFAULT_RPC_URLS: Record<string, string[]> = {
  // Dymension Hub
  dymension: [
    'https://rpc-dymension.mzonder.com:443',
  ],

  // Ethereum
  ethereum: [
    'https://eth.llamarpc.com',
    'https://ethereum.publicnode.com',
    'https://eth.drpc.org',
  ],

  // Base
  base: [
    'https://mainnet.base.org',
    'https://base.blockpi.network/v1/rpc/public',
    'https://base.drpc.org',
  ],

  // BSC
  bsc: [
    'https://bsc.drpc.org',
    'https://binance.llamarpc.com',
    'https://bsc.blockrazor.xyz',
  ],

  // Solana
  solanamainnet: [
    'https://api.mainnet-beta.solana.com',
  ],
  solanatestnet: [
    'https://api.testnet.solana.com',
  ],
} as const;

// REST/gRPC for Cosmos chains
export const DEFAULT_REST_URLS: Record<string, string> = {
  dymension: 'https://api-dymension.mzonder.com:443',
};

export const DEFAULT_GRPC_URLS: Record<string, string> = {
  dymension: 'https://grpc-dymension.mzonder.com:443',
};
```

### 6.3 Configuration Interface

```typescript
// src/dymension/config.ts

export interface DymensionBridgeConfig {
  // RPC overrides (optional - uses defaults if not provided)
  rpcUrls?: Partial<Record<ChainName, string>>;
  restUrls?: Partial<Record<ChainName, string>>;
  grpcUrls?: Partial<Record<ChainName, string>>;

  // Network selection
  network?: 'mainnet' | 'testnet';

  // Optional custom contract addresses (for testing)
  contractOverrides?: {
    warpRoutes?: Record<string, string>;
    igp?: Record<string, string>;
    mailbox?: Record<string, string>;
  };
}

export function createConfig(userConfig: DymensionBridgeConfig = {}): ResolvedConfig {
  const network = userConfig.network ?? 'mainnet';

  return {
    rpcUrls: {
      ...DEFAULT_RPC_URLS,
      ...userConfig.rpcUrls,
    },
    restUrls: {
      ...DEFAULT_REST_URLS,
      ...userConfig.restUrls,
    },
    domains: network === 'mainnet' ? MAINNET_DOMAINS : TESTNET_DOMAINS,
    contracts: network === 'mainnet' ? MAINNET_CONTRACTS : TESTNET_CONTRACTS,
    // ... merge overrides
  };
}
```

### 6.4 Usage Pattern

```typescript
import { createBridgeClient } from '@dymension/bridge-sdk';

// Option 1: Use all defaults (simplest)
const client = createBridgeClient();

// Option 2: Override specific RPCs
const client = createBridgeClient({
  rpcUrls: {
    ethereum: 'https://my-private-eth-node.com',
    dymension: 'https://my-custom-dym-rpc.com',
  },
});

// Option 3: Use testnet
const client = createBridgeClient({
  network: 'testnet',
});
```

### 6.5 Hardcoded Constants

```typescript
// src/dymension/constants.ts

export const DOMAINS = {
  DYMENSION_MAINNET: 1570310961,
  DYMENSION_TESTNET: 482195613,
  KASPA_MAINNET: 1082673309,
  KASPA_TESTNET: 80808082,
  ETHEREUM: 1,
  BASE: 8453,
  BSC: 56,
  SOLANA_MAINNET: 1399811149,
  SOLANA_TESTNET: 1399811150,
} as const;

export const HUB_TOKEN_IDS = {
  KAS: '0x726f757465725f61707000000000000000000000000000020000000000000000',
  ETH: '0x726f757465725f61707000000000000000000000000000020000000000000002',
  DYM: '0x726f757465725f61707000000000000000000000000000010000000000000001',
} as const;

export const ETHEREUM_CONTRACTS = {
  ETH_WARP: '0x4E19c3E50a9549970f5b7fDAb76c9bE71C878641',
  DYM_WARP: '0x408C4ECBe5D68a135be87e01aDaf91906e982127',
  KAS_WARP: '0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF',
} as const;

export const BASE_CONTRACTS = {
  DYM_WARP: '0x19CCc0859A26fF815E48aA89820691c306253C5a',
  KAS_WARP: '0x9c3dfFBE238B3A472233151a49A99431966De087',
} as const;

export const BSC_CONTRACTS = {
  DYM_WARP: '0x98ddD4fDff5a2896D1Bd6A1d668FD3D305E8E724',
  KAS_WARP: '0x8AC2505B0Fe4F73c7A0FCc5c63DB2bCBb1221357',
} as const;

export const KASPA = {
  ESCROW_MAINNET: 'kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh',
  ESCROW_TESTNET: 'kaspatest:pzwcd30pvdn0k4snvj5awkmlm6srzuw8d8e766ff5vwceg2akta3799nq2a3p',
  MIN_DEPOSIT_SOMPI: 4_000_000_000n,  // 40 KAS
  SOMPI_PER_KAS: 100_000_000n,
} as const;

export const HUB_MAILBOX = '0x68797065726c616e650000000000000000000000000000000000000000000000';
```

### 6.6 Why This Pattern?

1. **Zero config for common case** - Most users just want mainnet defaults
2. **Allows private infrastructure** - Traders can use private RPCs
3. **Type-safe overrides** - TypeScript catches invalid chain names
4. **Registry-backed defaults** - Uses official Hyperlane Registry values
5. **Network switching** - Easy mainnet/testnet toggle

---

## Part 7: Implementation Plan

### 7.1 Add Kaspa Payload Utilities

**Location**: `typescript/sdk/src/token/adapters/KaspaPayload.ts`

```typescript
import { solidityPacked } from 'ethers';
import { fromBech32 } from '@cosmjs/encoding';
import { DOMAINS, HUB_TOKEN_IDS, KASPA } from '../../dymension/constants.js';

export function serializeWarpPayload(recipient: Uint8Array, amount: bigint): Uint8Array {
  // 64 bytes: 12 padding + 20 recipient + 32 amount
  const result = new Uint8Array(64);
  result.fill(0, 0, 12);
  result.set(recipient, 12);
  const amountHex = amount.toString(16).padStart(64, '0');
  for (let i = 0; i < 32; i++) {
    result[32 + i] = parseInt(amountHex.substring(i * 2, i * 2 + 2), 16);
  }
  return result;
}

export function serializeKaspaDepositPayload(params: {
  hubRecipient: string;  // bech32 dym1... address
  amount: bigint;        // amount in sompi
  network?: 'mainnet' | 'testnet';
}): Uint8Array {
  const { hubRecipient, amount, network = 'mainnet' } = params;

  // Validate minimum
  if (amount < KASPA.MIN_DEPOSIT_SOMPI) {
    throw new Error(`Minimum deposit is ${KASPA.MIN_DEPOSIT_SOMPI} sompi (40 KAS)`);
  }

  const hubDomain = network === 'mainnet' ? DOMAINS.DYMENSION_MAINNET : DOMAINS.DYMENSION_TESTNET;
  const kaspaDomain = network === 'mainnet' ? DOMAINS.KASPA_MAINNET : DOMAINS.KASPA_TESTNET;

  // Convert bech32 to bytes
  const recipientBytes = fromBech32(hubRecipient).data;
  const bodyHex = serializeWarpPayload(recipientBytes, amount);

  // Construct Hyperlane message
  const messageHex = solidityPacked(
    ['uint8', 'uint32', 'uint32', 'bytes32', 'uint32', 'bytes32', 'bytes'],
    [
      3,                                    // version
      1,                                    // nonce (placeholder)
      kaspaDomain,                          // origin
      '0x' + '0'.repeat(64),                // sender (zeros for Kaspa)
      hubDomain,                            // destination
      HUB_TOKEN_IDS.KAS,                    // recipient (warp token)
      bodyHex,                              // body
    ]
  );

  return new Uint8Array(Buffer.from(messageHex.slice(2), 'hex'));
}

export function getKaspaEscrowAddress(network: 'mainnet' | 'testnet' = 'mainnet'): string {
  return network === 'mainnet' ? KASPA.ESCROW_MAINNET : KASPA.ESCROW_TESTNET;
}
```

### 7.2 Add Forward Module Memo Helpers (Critical)

**Location**: `typescript/sdk/src/dymension/forward.ts`

This is the most important addition - enabling RollApp → Hub → External chain forwarding.

#### 7.2.1 Understanding the Flow

```
RollApp User
    │
    ▼ IBC MsgTransfer with special memo
Dymension Hub (EIBC fulfillment)
    │
    ▼ CompletionHook executes after fulfillment
Hyperlane MsgRemoteTransfer
    │
    ▼
External Chain (Ethereum, Kaspa, etc.)
```

#### 7.2.2 Memo Structure for EIBC → Hyperlane

The memo has nested structure:
1. **Outer JSON**: EIBC memo with `fee` and `dym_on_completion`
2. **dym_on_completion**: Base64-encoded protobuf of `CompletionHookCall`
3. **CompletionHookCall.Data**: Protobuf-encoded `HookForwardToHL`

```json
{
  "eibc": {
    "fee": "100",
    "dym_on_completion": "<base64(proto(CompletionHookCall))>"
  }
}
```

Where `CompletionHookCall` is:
```protobuf
message CompletionHookCall {
  string name = 1;  // "dym-fwd-roll-hl"
  bytes data = 2;   // proto(HookForwardToHL)
}
```

And `HookForwardToHL` wraps a `MsgRemoteTransfer`:
```protobuf
message HookForwardToHL {
  hyperlane.warp.v1.MsgRemoteTransfer hyperlane_transfer = 1;
}
```

#### 7.2.3 TypeScript Implementation

```typescript
import { toBase64 } from '@cosmjs/encoding';

// Hook name constant
const HOOK_NAME_ROLL_TO_HL = 'dym-fwd-roll-hl';
const HOOK_NAME_ROLL_TO_IBC = 'dym-fwd-roll-ibc';

// Protobuf types (need to generate or hand-code)
interface MsgRemoteTransfer {
  tokenId: string;           // 32-byte hex, e.g. "0x726f757465725f617070..."
  destinationDomain: number; // e.g. 1 for Ethereum
  recipient: string;         // 32-byte hex, padded address
  amount: string;            // Amount as string
  maxFee: { denom: string; amount: string };
  gasLimit: string;          // Can be "0"
  customHookId?: string;     // Optional
  customHookMetadata?: string; // Optional
}

interface HookForwardToHL {
  hyperlaneTransfer: MsgRemoteTransfer;
}

interface CompletionHookCall {
  name: string;
  data: Uint8Array;
}

/**
 * Creates EIBC memo for RollApp → Hub → Hyperlane forwarding
 *
 * @param eibcFee - Fee for EIBC fulfiller (in base denom units as string)
 * @param params - Hyperlane transfer parameters
 * @returns JSON memo string to include in IBC MsgTransfer
 */
export function createRollAppToHyperlaneMemo(
  eibcFee: string,
  params: {
    tokenId: string;           // Hub token ID for the asset
    destinationDomain: number; // Hyperlane domain (e.g., 1 for Ethereum)
    recipient: string;         // Recipient on destination (32-byte hex)
    amount: string;            // Amount to forward
    maxFee: { denom: string; amount: string }; // Max Hyperlane fee
    gasLimit?: string;
  }
): string {
  // 1. Create MsgRemoteTransfer
  const msgRemoteTransfer: MsgRemoteTransfer = {
    tokenId: params.tokenId,
    destinationDomain: params.destinationDomain,
    recipient: params.recipient,
    amount: params.amount,
    maxFee: params.maxFee,
    gasLimit: params.gasLimit || '0',
  };

  // 2. Wrap in HookForwardToHL
  const hookForwardToHL: HookForwardToHL = {
    hyperlaneTransfer: msgRemoteTransfer,
  };

  // 3. Proto-encode HookForwardToHL
  const hookForwardToHLBytes = protoEncode(hookForwardToHL); // Need proto encoding

  // 4. Create CompletionHookCall
  const completionHookCall: CompletionHookCall = {
    name: HOOK_NAME_ROLL_TO_HL,
    data: hookForwardToHLBytes,
  };

  // 5. Proto-encode CompletionHookCall
  const completionHookCallBytes = protoEncode(completionHookCall);

  // 6. Base64 encode
  const dymOnCompletion = toBase64(completionHookCallBytes);

  // 7. Create final memo JSON
  const memo = {
    eibc: {
      fee: eibcFee,
      dym_on_completion: dymOnCompletion,
    },
  };

  return JSON.stringify(memo);
}

/**
 * Creates IBC memo for external chain → Hub → Hyperlane forwarding
 * (For non-RollApp IBC sources like Osmosis)
 */
export function createIBCToHyperlaneMemo(params: {
  tokenId: string;
  destinationDomain: number;
  recipient: string;
  amount: string;
  maxFee: { denom: string; amount: string };
  gasLimit?: string;
}): string {
  // Similar to above, but uses ibc_completion format:
  // { "on_completion": "<base64>" }
  // ...implementation
}

/**
 * Converts Cosmos bech32 address to Hyperlane 32-byte hex format
 * Pads 20-byte address to 32 bytes with leading zeros
 */
export function cosmosAddressToHyperlane(bech32Address: string): string {
  const { data } = fromBech32(bech32Address);
  // Pad to 32 bytes
  const padded = new Uint8Array(32);
  padded.set(data, 32 - data.length);
  return '0x' + Buffer.from(padded).toString('hex');
}

/**
 * Converts EVM address to Hyperlane 32-byte hex format
 */
export function evmAddressToHyperlane(address: string): string {
  const cleaned = address.toLowerCase().replace('0x', '');
  return '0x' + cleaned.padStart(64, '0');
}
```

#### 7.2.4 Full Example: RollApp → Ethereum

```typescript
import { createRollAppToHyperlaneMemo, evmAddressToHyperlane } from '@hyperlane-xyz/sdk';
import { DOMAINS, HUB_TOKEN_IDS } from '@hyperlane-xyz/sdk/dymension';

// User on RollApp wants to send DYM to Ethereum
const memo = createRollAppToHyperlaneMemo(
  '1000000000000000000', // 1 DYM EIBC fee (in adym)
  {
    tokenId: HUB_TOKEN_IDS.DYM,
    destinationDomain: DOMAINS.ETHEREUM,
    recipient: evmAddressToHyperlane('0x742d35Cc6634C0532925a3b844Bc9e7595f...'),
    amount: '10000000000000000000', // 10 DYM to forward
    maxFee: { denom: 'adym', amount: '100000000000000000' }, // 0.1 DYM max fee
  }
);

// Now create IBC MsgTransfer from RollApp
const ibcTransfer = {
  typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
  value: {
    sourcePort: 'transfer',
    sourceChannel: 'channel-0', // RollApp's channel to Hub
    token: { denom: 'adym', amount: '11100000000000000000' }, // Amount + EIBC fee + HL fee
    sender: 'rollapp1...user...',
    receiver: 'dym1...hub-address...', // Hub intermediary address
    timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
    memo: memo, // The forwarding memo!
  },
};
```

#### 7.2.5 Important Validation Rules

From the forward module:
1. **Token denom must match** - The IBC token arriving on Hub must match the `maxFee.denom`
2. **Budget constraint** - `amount + maxFee.amount` must NOT exceed the arriving token amount
3. **Recipient format** - Must be valid 32-byte hex for destination chain
4. **Token ID must exist** - Must be a registered warp token on Hub

#### 7.2.6 Safety: What Happens on Failure?

The forward module is designed to be safe:
- **Funds are credited BEFORE hook execution** - User already has tokens on Hub
- **If forwarding fails** - Tokens remain with the EIBC fulfiller (or original recipient)
- **No automatic refund** - By design, to prevent replay attacks
- **Frontend responsibility** - Must handle recovery/retry for failed forwards

### 7.3 Add Fee Calculation Utilities

**Location**: `typescript/sdk/src/dymension/fees.ts`

(As detailed in Part 5)

### 7.4 Add Documentation & Examples

**Location**: `typescript/sdk/docs/dymension/` or `typescript/sdk/examples/`

- README with quick start
- Example: Hub → Kaspa withdrawal
- Example: Kaspa → Hub deposit
- Example: Hub → Ethereum transfer
- Example: Multi-hop IBC → Hub → EVM

---

## Part 8: Package Publishing Strategy

### 8.1 Recommendation: Standalone npm Package

**Package Name**: `@dymension/bridge-sdk`

**Rationale**:
1. **Independent versioning** - Not tied to Hyperlane monorepo releases
2. **Lightweight** - Only Dymension-specific code, depends on `@hyperlane-xyz/sdk`
3. **Clear ownership** - Under `@dymension` npm scope
4. **Easy adoption** - Simple `npm install @dymension/bridge-sdk`

### 8.2 Package Structure

```
@dymension/bridge-sdk/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                 # Main exports
│   ├── client.ts                # BridgeClient class
│   │
│   ├── adapters/
│   │   ├── index.ts
│   │   └── KaspaPayloadAdapter.ts
│   │
│   ├── forward/
│   │   ├── index.ts
│   │   ├── memo.ts              # EIBC/IBC memo construction
│   │   ├── metadata.ts          # HLMetadata construction
│   │   └── types.ts             # Protobuf type definitions
│   │
│   ├── fees/
│   │   ├── index.ts
│   │   ├── bridging.ts          # Bridging fee calculation
│   │   ├── eibc.ts              # EIBC fee calculation
│   │   └── igp.ts               # IGP fee helpers
│   │
│   ├── config/
│   │   ├── index.ts
│   │   ├── constants.ts         # Domain IDs, token IDs, contracts
│   │   ├── rpc.ts               # Default RPC endpoints
│   │   └── types.ts
│   │
│   └── utils/
│       ├── index.ts
│       ├── address.ts           # Address conversion utilities
│       └── proto.ts             # Protobuf encoding helpers
│
├── examples/
│   ├── hub-to-ethereum.ts
│   ├── ethereum-to-hub.ts
│   ├── kaspa-deposit.ts
│   ├── rollapp-to-ethereum.ts
│   └── fee-estimation.ts
│
└── dist/                        # Build output
    └── ...
```

### 8.3 package.json Configuration

```json
{
  "name": "@dymension/bridge-sdk",
  "version": "1.0.0",
  "description": "Programmatic bridging SDK for Dymension Hyperlane integration",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./adapters": "./dist/adapters/index.js",
    "./forward": "./dist/forward/index.js",
    "./fees": "./dist/fees/index.js",
    "./config": "./dist/config/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "clean": "rm -rf dist",
    "lint": "eslint src/",
    "test": "vitest",
    "prepublishOnly": "npm run build"
  },
  "dependencies": {
    "@hyperlane-xyz/sdk": "^18.2.0",
    "@hyperlane-xyz/utils": "^18.2.0",
    "@cosmjs/encoding": "^0.32.0",
    "@cosmjs/proto-signing": "^0.32.0",
    "ethers": "^5.7.0"
  },
  "peerDependencies": {
    "@solana/web3.js": "^1.87.0"
  },
  "peerDependenciesMeta": {
    "@solana/web3.js": {
      "optional": true
    }
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "eslint": "^8.56.0"
  },
  "engines": {
    "node": ">=18"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/dymensionxyz/bridge-sdk"
  },
  "keywords": [
    "dymension",
    "hyperlane",
    "bridge",
    "cross-chain",
    "kaspa",
    "ethereum",
    "solana"
  ],
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  }
}
```

### 8.4 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "examples"]
}
```

### 8.5 Publishing Workflow

**CI/CD via GitHub Actions**:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 8.6 Versioning Strategy

- Use semantic versioning (semver)
- Major version for breaking API changes
- Minor version for new features (new chains, routes)
- Patch version for bug fixes and constant updates

**Example version bumps**:
- `1.0.0` → `1.0.1`: Fix fee calculation bug
- `1.0.1` → `1.1.0`: Add new token support
- `1.1.0` → `2.0.0`: Change `createBridgeClient` API

---

## Part 9: Complete Directory Structure

### 9.1 New Package Location

The SDK will be a **new standalone package** (not inside the monorepo):

```
github.com/dymensionxyz/bridge-sdk/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── publish.yml
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── adapters/
│   ├── forward/
│   ├── fees/
│   ├── config/
│   └── utils/
├── examples/
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

### 9.2 Source File Overview

```
src/
├── index.ts                     # Public API exports
│   export { createBridgeClient, BridgeClient }
│   export { DOMAINS, HUB_TOKEN_IDS, ... }
│   export { calculateBridgingFee, estimateBridgeFees }
│   export { createRollAppToHyperlaneMemo, ... }
│   export type { DymensionBridgeConfig, FeeBreakdown, ... }
│
├── client.ts                    # Main client class
│   class BridgeClient {
│     constructor(config?: DymensionBridgeConfig)
│     // Hub transfers
│     populateHubToEvmTx(params): Promise<MsgRemoteTransferEncodeObject>
│     populateHubToSolanaTx(params): Promise<MsgRemoteTransferEncodeObject>
│     populateHubToKaspaTx(params): Promise<MsgRemoteTransferEncodeObject>
│     // EVM transfers
│     populateEvmToHubTx(params): Promise<PopulatedTransaction>
│     // Solana transfers
│     populateSolanaToHubTx(params): Promise<Transaction>
│     // Kaspa (payload only)
│     createKaspaDepositPayload(params): Uint8Array
│     // RollApp forwarding
│     createRollAppToEvmMemo(params): string
│     // Fee estimation
│     estimateFees(params): Promise<FeeBreakdown>
│   }
│
├── adapters/
│   ├── index.ts
│   └── KaspaPayloadAdapter.ts   # Kaspa payload serialization
│
├── forward/
│   ├── index.ts
│   ├── memo.ts                  # createRollAppToHyperlaneMemo()
│   │                            # createIBCToHyperlaneMemo()
│   ├── metadata.ts              # createHLMetadataForIBC()
│   │                            # createHLMetadataForHL()
│   └── types.ts                 # HookForwardToHL, CompletionHookCall, etc.
│
├── fees/
│   ├── index.ts
│   ├── bridging.ts              # calculateBridgingFee()
│   ├── eibc.ts                  # calculateEibcWithdrawal()
│   └── igp.ts                   # wrappers around SDK IGP
│
├── config/
│   ├── index.ts
│   ├── constants.ts             # DOMAINS, HUB_TOKEN_IDS, contracts
│   ├── rpc.ts                   # DEFAULT_RPC_URLS
│   └── types.ts                 # DymensionBridgeConfig interface
│
└── utils/
    ├── index.ts
    ├── address.ts               # cosmosAddressToHyperlane()
    │                            # evmAddressToHyperlane()
    └── proto.ts                 # Protobuf encoding helpers
```

### 9.3 Example Usage

```typescript
// examples/hub-to-ethereum.ts
import { createBridgeClient, DOMAINS, HUB_TOKEN_IDS } from '@dymension/bridge-sdk';

async function main() {
  // Create client with defaults
  const client = createBridgeClient();

  // Estimate fees first
  const fees = await client.estimateFees({
    source: 'dymension',
    destination: 'ethereum',
    amount: 10_000_000_000_000_000_000n, // 10 DYM
  });

  console.log('Fee breakdown:', fees);

  // Create unsigned transaction
  const tx = await client.populateHubToEvmTx({
    tokenId: HUB_TOKEN_IDS.DYM,
    destination: DOMAINS.ETHEREUM,
    recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f...',
    amount: 10_000_000_000_000_000_000n,
    sender: 'dym1...',
  });

  // User signs with their wallet
  // const signed = await wallet.sign([tx], fee, memo);
  // await client.broadcastTx(signed);
}
```

```typescript
// examples/rollapp-to-ethereum.ts
import { createBridgeClient, evmAddressToHyperlane, DOMAINS, HUB_TOKEN_IDS } from '@dymension/bridge-sdk';

async function bridgeFromRollApp() {
  const client = createBridgeClient();

  // Create the forwarding memo for EIBC
  const memo = client.createRollAppToEvmMemo({
    eibcFeePercent: 0.5,  // 0.5% EIBC fee
    tokenId: HUB_TOKEN_IDS.DYM,
    destinationDomain: DOMAINS.ETHEREUM,
    recipient: evmAddressToHyperlane('0x742d35Cc...'),
    amount: '10000000000000000000',
    maxFee: { denom: 'adym', amount: '100000000000000000' },
  });

  // Now construct IBC transfer on RollApp with this memo
  const ibcTx = {
    typeUrl: '/ibc.applications.transfer.v1.MsgTransfer',
    value: {
      sourcePort: 'transfer',
      sourceChannel: 'channel-0',
      token: { denom: 'adym', amount: '10500000000000000000' },
      sender: 'rollapp1...',
      receiver: 'dym1...',
      timeoutTimestamp: BigInt(Date.now() + 600_000) * 1_000_000n,
      memo: memo,
    },
  };
}
```

---

## Appendix A: Existing SDK Architecture

```
typescript/sdk/src/
├── token/
│   └── adapters/
│       ├── CosmosModuleTokenAdapter.ts  ← Hub adapter (EXISTS)
│       ├── SealevelTokenAdapter.ts      ← Solana adapter (EXISTS)
│       ├── EvmTokenAdapter.ts           ← EVM adapter (EXISTS)
│       └── KaspaPayload.ts              ← NEW: Kaspa payload only
├── warp/
│   └── WarpCore.ts                      ← Main orchestration (EXISTS)
├── providers/
│   └── MultiProtocolProvider.ts         ← Provider management (EXISTS)
└── dymension/                           ← NEW: Dymension-specific
    ├── constants.ts                     ← Hardcoded values
    └── forward.ts                       ← Forward module helpers
```

## Appendix B: Contract Addresses Reference

### Mainnet

| Chain | Token | Contract |
|-------|-------|----------|
| Dymension | KAS | `0x726f757465725f61707000000000000000000000000000020000000000000000` |
| Dymension | ETH | `0x726f757465725f61707000000000000000000000000000020000000000000002` |
| Dymension | DYM | `0x726f757465725f61707000000000000000000000000000010000000000000001` |
| Ethereum | ETH | `0x4E19c3E50a9549970f5b7fDAb76c9bE71C878641` |
| Ethereum | DYM | `0x408C4ECBe5D68a135be87e01aDaf91906e982127` |
| Ethereum | KAS | `0x18e6C30487e61B117bDE1218aEf2D9Bd7742c4CF` |
| Base | DYM | `0x19CCc0859A26fF815E48aA89820691c306253C5a` |
| Base | KAS | `0x9c3dfFBE238B3A472233151a49A99431966De087` |
| BSC | DYM | `0x98ddD4fDff5a2896D1Bd6A1d668FD3D305E8E724` |
| BSC | KAS | `0x8AC2505B0Fe4F73c7A0FCc5c63DB2bCBb1221357` |
| Kaspa | Escrow | `kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh` |

### Domain IDs

| Chain | Domain ID |
|-------|-----------|
| Dymension Mainnet | 1570310961 |
| Dymension Testnet | 482195613 |
| Kaspa Mainnet | 1082673309 |
| Kaspa Testnet | 80808082 |
| Ethereum | 1 |
| Base | 8453 |
| BSC | 56 |
| Solana Mainnet | 1399811149 |
| Solana Testnet | 1399811150 |

---

*Document Version: 3.0*
*Last Updated: 2025-12-05*
*Author: Claude (AI Assistant)*
