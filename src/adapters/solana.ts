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
 * Parameters for Solana to Hub transfers with forwarding
 */
export interface SolanaToHubWithForwardingParams {
  tokenProgramId: string;
  /** Hub recipient address (dym1...) - will receive funds after forwarding or if forwarding fails */
  hubRecipient: string;
  amount: bigint;
  sender: string;
  /** HLMetadata bytes for forwarding (use createHLMetadataForIBC or createHLMetadataForHL) */
  metadata: Uint8Array;
  network?: 'mainnet' | 'testnet';
  rpcUrl: string;
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

/**
 * Build a partial Solana transaction for transferring tokens to Hub with forwarding
 *
 * This transaction must be signed by the user's wallet before submission.
 * The transaction includes:
 * - Compute budget instructions for priority fees
 * - Transfer remote memo instruction to the Hyperlane warp program
 *
 * Use createHLMetadataForIBC() for forwarding to IBC chains (e.g., Osmosis, Cosmos Hub)
 * Use createHLMetadataForHL() for forwarding to other Hyperlane chains (e.g., Kaspa, other EVM)
 *
 * @param params - Transfer parameters including HLMetadata for forwarding
 * @returns Partial transaction ready for user signature
 */
export async function buildSolanaToHubWithForwardingTx(
  params: SolanaToHubWithForwardingParams,
): Promise<Transaction> {
  const {
    tokenProgramId,
    hubRecipient,
    amount,
    sender,
    metadata,
    network = 'mainnet',
    rpcUrl,
  } = params;

  const warpProgramPubKey = new PublicKey(tokenProgramId);
  const senderPubKey = new PublicKey(sender);
  const hubDomain = network === 'mainnet' ? DOMAINS.DYMENSION_MAINNET : DOMAINS.DYMENSION_TESTNET;

  // Hub recipient is a Cosmos address, convert it to Hyperlane format
  const recipientHex = cosmosAddressToHyperlane(hubRecipient);
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

  // Serialize TransferRemoteMemo instruction using DymInstruction format
  const instructionData = serializeTransferRemoteMemoInstruction(
    hubDomain,
    recipientBytes,
    amount,
    metadata,
  );

  const transferRemoteMemoInstruction = new TransactionInstruction({
    keys,
    programId: warpProgramPubKey,
    data: Buffer.concat([
      Buffer.from([1, 1, 1, 1, 1, 1, 1, 1]), // Discriminator
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
  tx.add(transferRemoteMemoInstruction);
  tx.partialSign(randomWallet);

  return tx;
}

/**
 * Serialize TransferRemoteMemo instruction data for DymInstruction enum
 *
 * Format (Borsh):
 * - 1 byte: enum variant index (0 for TransferRemoteMemo)
 * - TransferRemoteMemo struct:
 *   - base (TransferRemote):
 *     - 4 bytes: destination_domain (u32 LE)
 *     - 32 bytes: recipient (H256)
 *     - 32 bytes: amount_or_id (U256 LE)
 *   - memo (Vec<u8>):
 *     - 4 bytes: length (u32 LE)
 *     - N bytes: data
 */
function serializeTransferRemoteMemoInstruction(
  destinationDomain: number,
  recipient: Uint8Array,
  amount: bigint,
  memo: Uint8Array,
): Buffer {
  // Calculate total size: 1 (variant) + 4 (domain) + 32 (recipient) + 32 (amount) + 4 (memo len) + memo.length
  const totalSize = 1 + 4 + 32 + 32 + 4 + memo.length;
  const buffer = Buffer.alloc(totalSize);
  let offset = 0;

  // Enum variant index (0 for TransferRemoteMemo)
  buffer.writeUInt8(0, offset);
  offset += 1;

  // destination_domain (u32 LE)
  buffer.writeUInt32LE(destinationDomain, offset);
  offset += 4;

  // recipient (H256 - 32 bytes)
  buffer.set(recipient, offset);
  offset += 32;

  // amount_or_id (U256 - 32 bytes LE)
  // Write the bigint as little-endian 256-bit value
  const amountBuf = bigintToU256LE(amount);
  buffer.set(amountBuf, offset);
  offset += 32;

  // memo length (u32 LE)
  buffer.writeUInt32LE(memo.length, offset);
  offset += 4;

  // memo data
  buffer.set(memo, offset);

  return buffer;
}

/**
 * Convert a bigint to a 32-byte little-endian U256 buffer
 */
function bigintToU256LE(value: bigint): Uint8Array {
  const buffer = new Uint8Array(32);
  let remaining = value;
  for (let i = 0; i < 32; i++) {
    buffer[i] = Number(remaining & BigInt(0xff));
    remaining = remaining >> BigInt(8);
  }
  return buffer;
}
