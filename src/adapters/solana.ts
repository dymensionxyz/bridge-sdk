/**
 * Solana-specific adapter for Hyperlane token bridging
 *
 * Solana uses Hyperlane's Sealevel implementation with PDAs (Program Derived Addresses).
 * This adapter builds partial transactions that must be signed by the user's wallet.
 */

import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  ComputeBudgetProgram,
  Keypair,
  Connection,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { DOMAINS, SOLANA } from '../config/constants.js';
import { cosmosAddressToHyperlane } from '../utils/address.js';

const SEALEVEL_SPL_NOOP_ADDRESS = 'noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV';

/**
 * Parameters for Solana to Hub transfers
 */
export interface SolanaToHubParams {
  tokenProgramId: string;
  recipient: string;
  amount: bigint;
  sender: string;
  network?: 'mainnet' | 'testnet';
  rpcUrl: string;
}

/**
 * Parameters for Hub to Solana transfers (Hub-side execution)
 */
export interface HubToSolanaParams {
  tokenId: string;
  recipient: string;
  amount: bigint;
  sender: string;
  network?: 'mainnet' | 'testnet';
}

/**
 * Build a partial Solana transaction for transferring tokens to Hub
 *
 * This transaction must be signed by the user's wallet before submission.
 * The transaction includes:
 * - Compute budget instructions for priority fees
 * - Transfer remote instruction to the Hyperlane warp program
 *
 * @param params - Transfer parameters
 * @returns Partial transaction ready for user signature
 */
export async function buildSolanaToHubTx(params: SolanaToHubParams): Promise<Transaction> {
  const { tokenProgramId, recipient, amount, sender, network = 'mainnet', rpcUrl } = params;

  const warpProgramPubKey = new PublicKey(tokenProgramId);
  const senderPubKey = new PublicKey(sender);
  const hubDomain = network === 'mainnet' ? DOMAINS.DYMENSION_MAINNET : DOMAINS.DYMENSION_TESTNET;

  // Recipient is a Cosmos address on the Hub, convert it to Hyperlane format
  const recipientHex = cosmosAddressToHyperlane(recipient);
  const recipientBytes = hexToBytes(recipientHex);

  const randomWallet = Keypair.generate();

  const connection = new Connection(rpcUrl, 'confirmed');

  const mailboxPubKey = deriveMailboxPda(warpProgramPubKey);
  const tokenPda = deriveHypTokenAccount(warpProgramPubKey);
  const mailboxOutbox = deriveMailboxOutboxAccount(mailboxPubKey);
  const dispatchAuthority = deriveMessageDispatchAuthorityAccount(warpProgramPubKey);
  const msgStorage = deriveMsgStorageAccount(mailboxPubKey, randomWallet.publicKey);

  const keys = [
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey(SEALEVEL_SPL_NOOP_ADDRESS), isSigner: false, isWritable: false },
    { pubkey: tokenPda, isSigner: false, isWritable: false },
    { pubkey: mailboxPubKey, isSigner: false, isWritable: false },
    { pubkey: mailboxOutbox, isSigner: false, isWritable: true },
    { pubkey: dispatchAuthority, isSigner: false, isWritable: false },
    { pubkey: senderPubKey, isSigner: true, isWritable: false },
    { pubkey: randomWallet.publicKey, isSigner: true, isWritable: false },
    { pubkey: msgStorage, isSigner: false, isWritable: true },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instructionData = serializeTransferRemoteInstruction(hubDomain, recipientBytes, amount);

  const transferRemoteInstruction = new TransactionInstruction({
    keys,
    programId: warpProgramPubKey,
    data: Buffer.concat([
      Buffer.from([1, 1, 1, 1, 1, 1, 1, 1]),
      instructionData,
    ]),
  });

  const setComputeLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: SOLANA.COMPUTE_UNIT_LIMIT,
  });

  const setPriorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: SOLANA.DEFAULT_PRIORITY_FEE,
  });

  const recentBlockhash = (await connection.getLatestBlockhash('finalized')).blockhash;

  const tx = new Transaction({
    feePayer: senderPubKey,
    recentBlockhash,
  });

  tx.add(setComputeLimitInstruction);
  tx.add(setPriorityFeeInstruction);
  tx.add(transferRemoteInstruction);
  tx.partialSign(randomWallet);

  return tx;
}

/**
 * Get the Solana warp token program ID for a given token
 */
export function getSolanaWarpProgramId(
  token: 'SOL' | 'USDC' | 'USDT',
  network: 'mainnet' | 'testnet' = 'mainnet',
): string {
  const contracts = network === 'mainnet' ? SOLANA.PROGRAMS_MAINNET : SOLANA.PROGRAMS_TESTNET;
  return contracts[token];
}

/**
 * Derive PDA for Hyperlane token account
 */
function deriveHypTokenAccount(warpProgramPubKey: PublicKey): PublicKey {
  return derivePda(
    ['hyperlane_message_recipient', '-', 'handle', '-', 'account_metas'],
    warpProgramPubKey,
  );
}

/**
 * Derive PDA for mailbox outbox
 */
function deriveMailboxOutboxAccount(mailbox: PublicKey): PublicKey {
  return derivePda(['hyperlane', '-', 'outbox'], mailbox);
}

/**
 * Derive PDA for message dispatch authority
 */
function deriveMessageDispatchAuthorityAccount(warpProgramPubKey: PublicKey): PublicKey {
  return derivePda(
    ['hyperlane_dispatcher', '-', 'dispatch_authority'],
    warpProgramPubKey,
  );
}

/**
 * Derive PDA for message storage
 */
function deriveMsgStorageAccount(mailbox: PublicKey, randomWallet: PublicKey): PublicKey {
  return derivePda(
    ['hyperlane', '-', 'dispatched_message', '-', randomWallet.toBuffer()],
    mailbox,
  );
}

/**
 * Derive PDA for mailbox from warp program
 */
function deriveMailboxPda(warpProgramPubKey: PublicKey): PublicKey {
  return derivePda(['hyperlane_mailbox'], warpProgramPubKey);
}

/**
 * Generic PDA derivation helper
 */
function derivePda(seeds: Array<string | Buffer | Uint8Array>, programId: PublicKey): PublicKey {
  const seedBuffers = seeds.map((seed) => {
    if (typeof seed === 'string') {
      return Buffer.from(seed);
    }
    return Buffer.from(seed);
  });
  const [pda] = PublicKey.findProgramAddressSync(seedBuffers, programId);
  return pda;
}

/**
 * Serialize transfer remote instruction data
 */
function serializeTransferRemoteInstruction(
  destinationDomain: number,
  recipient: Uint8Array,
  amount: bigint,
): Buffer {
  const buffer = Buffer.alloc(44);
  let offset = 0;

  buffer.writeUInt32LE(destinationDomain, offset);
  offset += 4;

  buffer.set(recipient, offset);
  offset += 32;

  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount);
  buffer.set(amountBuf, offset);

  return buffer;
}

/**
 * Helper: convert hex string to bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Derive associated token account for a given owner
 */
export function deriveAssociatedTokenAccount(
  tokenMint: PublicKey,
  owner: PublicKey,
): PublicKey {
  return getAssociatedTokenAddressSync(tokenMint, owner, true, TOKEN_2022_PROGRAM_ID);
}
