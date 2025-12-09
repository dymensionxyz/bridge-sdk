# Fee Calculation

This document explains how fees are calculated for bridge transfers.

## Fee Components

### 1. Bridging Fee

A percentage fee charged on all bridge transfers. Currently 0.1% (10 basis points).

```typescript
bridgingFee = amount * bridgingFeeRate
// Example: 10 DYM * 0.001 = 0.01 DYM
```

### 2. IGP Fee (Interchain Gas Paymaster)

Fee paid to cover gas costs on the destination chain. This varies by destination:

| Destination | Typical Gas | Approx Fee |
|-------------|-------------|------------|
| Ethereum    | 200,000     | ~0.01 ETH  |
| Base        | 200,000     | ~0.0001 ETH|
| BSC         | 200,000     | ~0.001 BNB |
| Solana      | 300,000     | ~0.00025 SOL|

The SDK uses `DEFAULT_GAS_AMOUNTS` for common destinations.

### 3. EIBC Fee (Elastic IBC)

For RollApp transfers using EIBC, an additional fee incentivizes fulfillers:

```typescript
eibcFee = (amount - bridgingFee) * eibcFeePercent / 100
// Example with 0.5% EIBC: (10 - 0.01) * 0.005 = 0.04995 DYM
```

## Fee Formulas

### Direct Transfer (Hub -> External)

```
recipientReceives = amount - bridgingFee - igpFee
```

### EIBC Transfer (RollApp -> External via Hub)

```
recipientReceives = amount - bridgingFee - eibcFee - igpFee
```

## Using the SDK

### Simple Fee Calculation

```typescript
import { calculateBridgingFee, DEFAULT_BRIDGING_FEE_RATE } from '@dymension/bridge-sdk';

const amount = 10_000_000_000_000_000_000n; // 10 tokens
const fee = calculateBridgingFee(amount, DEFAULT_BRIDGING_FEE_RATE);
```

### EIBC Fee Calculation

```typescript
import { calculateEibcWithdrawal } from '@dymension/bridge-sdk';

const result = calculateEibcWithdrawal(
  10_000_000_000_000_000_000n, // amount
  0.5 // EIBC fee percent
);

console.log(result.eibcFee);        // EIBC fee amount
console.log(result.bridgingFee);    // Bridging fee amount
console.log(result.recipientReceives); // Final amount
```

### Full Fee Estimation

```typescript
import { createBridgeClient } from '@dymension/bridge-sdk';

const client = createBridgeClient();

const fees = await client.estimateFees({
  source: 'dymension',
  destination: 'ethereum',
  amount: 10_000_000_000_000_000_000n,
});

console.log('Bridging fee:', fees.bridgingFee);
console.log('IGP fee:', fees.igpFee);
console.log('Total fees:', fees.totalFees);
console.log('Recipient receives:', fees.recipientReceives);
```

## Fee Constants

```typescript
// Default rates
DEFAULT_BRIDGING_FEE_RATE = 0.001  // 0.1%
DEFAULT_EIBC_FEE_PERCENT = 0.5    // 0.5%

// Default gas amounts by domain
DEFAULT_GAS_AMOUNTS = {
  [DOMAINS.ETHEREUM]: 200_000n,
  [DOMAINS.BASE]: 200_000n,
  [DOMAINS.BSC]: 200_000n,
  [DOMAINS.SOLANA_MAINNET]: 300_000n,
}
```
