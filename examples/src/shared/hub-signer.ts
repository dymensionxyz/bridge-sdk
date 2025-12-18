/**
 * Dymension Hub signer utilities
 *
 * Provides wallet creation and signing client for Hub transactions.
 * Uses coin type 60 (Ethereum) which is required for Dymension.
 */

import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing';
import { SigningStargateClient, GasPrice, StdFee } from '@cosmjs/stargate';
import { stringToPath } from '@cosmjs/crypto';

/** Dymension HD path: m/44'/60'/0'/0/0 (coin type 60 like Ethereum) */
const DYM_HD_PATH = "m/44'/60'/0'/0/0";

/** Default gas price for Dymension Hub */
const DYM_GAS_PRICE = '20000000000adym';

/** Fixed fee for custom message types (simulation often fails) */
export const FIXED_FEE: StdFee = {
  amount: [{ denom: 'adym', amount: '2500000000000000' }],
  gas: '500000',
};

/**
 * Create a Dymension wallet from mnemonic
 *
 * Uses the correct HD path (coin type 60) for Dymension.
 */
export async function createDymWallet(mnemonic: string): Promise<DirectSecp256k1HdWallet> {
  return DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'dym',
    hdPaths: [stringToPath(DYM_HD_PATH)],
  });
}

/**
 * Get the sender address from a wallet
 */
export async function getSenderAddress(wallet: DirectSecp256k1HdWallet): Promise<string> {
  const [account] = await wallet.getAccounts();
  return account.address;
}

/**
 * Create a signing client for Dymension Hub
 *
 * @param rpcUrl - Hub RPC endpoint
 * @param wallet - Wallet to sign with
 * @param registry - Optional custom registry (e.g., for Hyperlane messages)
 */
export async function createHubSigningClient(
  rpcUrl: string,
  wallet: DirectSecp256k1HdWallet,
  registry?: Registry,
): Promise<SigningStargateClient> {
  return SigningStargateClient.connectWithSigner(rpcUrl, wallet, {
    gasPrice: GasPrice.fromString(DYM_GAS_PRICE),
    registry,
  });
}
