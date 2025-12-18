//! Kaspa deposit sender for Dymension bridge
//!
//! Sends a Kaspa transaction with Hyperlane payload to the escrow address.
//! Use this after generating the payload with the TypeScript SDK.
//!
//! Prerequisites:
//! - A rusty-kaspa wallet file exists at ~/.kaspa/ (or custom --wallet-dir)
//! - Wallet has sufficient KAS balance
//!
//! Usage:
//!   cargo run -- \
//!     --wallet-secret "your-wallet-password" \
//!     --amount 4000000000 \
//!     --payload "03000000..." \
//!     --escrow "kaspa:prztt2hd2txge07syjvhaz5j6l9ql6djhc9equela058rjm6vww0uwre5dulh" \
//!     --network mainnet \
//!     --rpc "wss://your-kaspa-node:17110"

use clap::Parser;
use eyre::Result;
use kaspa_addresses::Address;
use kaspa_consensus_core::network::{NetworkId, NetworkType};
use kaspa_wallet_core::prelude::*;
use kaspa_wallet_core::storage::local::set_default_storage_folder as unsafe_set_default_storage_folder_kaspa;
use kaspa_wallet_core::tx::Fees;
use kaspa_wallet_core::wallet::Wallet;
use kaspa_wallet_keys::secret::Secret;
use kaspa_wrpc_client::Resolver;
use std::sync::Arc;
use workflow_core::abortable::Abortable;

#[derive(Parser, Debug)]
#[command(name = "kaspa-sender")]
#[command(about = "Send Kaspa deposit transaction with Hyperlane payload")]
struct Args {
    /// Wallet password (protects the keychain file)
    #[arg(long)]
    wallet_secret: String,

    /// Custom wallet directory (default: ~/.kaspa/)
    #[arg(long)]
    wallet_dir: Option<String>,

    /// Amount in sompi (1 KAS = 100,000,000 sompi)
    #[arg(long)]
    amount: u64,

    /// Hyperlane message payload (hex encoded, from TypeScript SDK)
    #[arg(long)]
    payload: String,

    /// Escrow address to send to
    #[arg(long)]
    escrow: String,

    /// Network (mainnet or testnet)
    #[arg(long, default_value = "mainnet")]
    network: String,

    /// Kaspa WRPC URL (e.g. wss://your-node:17110)
    #[arg(long)]
    rpc: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    let network_id = match args.network.as_str() {
        "mainnet" => NetworkId::new(NetworkType::Mainnet),
        "testnet" => NetworkId::with_suffix(NetworkType::Testnet, 10),
        other => return Err(eyre::eyre!("unknown network: {}", other)),
    };

    let secret = Secret::from(args.wallet_secret);

    eprintln!("initializing kaspa wallet...");
    let wallet = get_wallet(&secret, network_id, args.rpc, args.wallet_dir).await?;

    let escrow_address = Address::try_from(args.escrow)?;
    let payload = hex::decode(&args.payload)?;

    eprintln!(
        "sending deposit: amount={} sompi, escrow={}, payload_len={}",
        args.amount,
        escrow_address,
        payload.len()
    );

    let tx_id = deposit_with_payload(&wallet, &secret, escrow_address, args.amount, payload).await?;

    println!("{}", tx_id);
    eprintln!("transaction submitted successfully");

    Ok(())
}

async fn get_wallet(
    s: &Secret,
    network_id: NetworkId,
    url: String,
    storage_folder: Option<String>,
) -> Result<Arc<Wallet>> {
    if let Some(storage_folder) = storage_folder {
        unsafe { unsafe_set_default_storage_folder_kaspa(storage_folder) }
            .map_err(|e| eyre::eyre!("failed to set storage folder: {}", e))?;
    }

    let local_store = Wallet::local_store()
        .map_err(|e| eyre::eyre!("failed to open wallet local store: {}", e))?;

    let w = Arc::new(
        Wallet::try_new(local_store, Some(Resolver::default()), Some(network_id))
            .map_err(|e| eyre::eyre!("failed to create wallet: {}", e))?,
    );

    w.start()
        .await
        .map_err(|e| eyre::eyre!("failed to start wallet: {}", e))?;

    w.clone()
        .connect(Some(url), &network_id)
        .await
        .map_err(|e| eyre::eyre!("failed to connect wallet: {}", e))?;

    if !w.is_connected() {
        return Err(eyre::eyre!("wallet not connected"));
    }

    w.clone()
        .wallet_open(s.clone(), None, true, false)
        .await
        .map_err(|e| eyre::eyre!("failed to open wallet: {}", e))?;

    let accounts = w
        .clone()
        .accounts_enumerate()
        .await
        .map_err(|e| eyre::eyre!("failed to enumerate accounts: {}", e))?;

    let account_descriptor = accounts
        .first()
        .ok_or_else(|| eyre::eyre!("wallet has no accounts"))?;

    let account_id = account_descriptor.account_id;

    w.clone()
        .accounts_select(Some(account_id))
        .await
        .map_err(|e| eyre::eyre!("failed to select wallet account: {}", e))?;

    w.clone()
        .accounts_activate(Some(vec![account_id]))
        .await
        .map_err(|e| eyre::eyre!("failed to activate wallet account: {}", e))?;

    eprintln!(
        "wallet ready: receive_address={}",
        account_descriptor.receive_address.as_ref().unwrap()
    );

    Ok(w)
}

async fn deposit_with_payload(
    w: &Arc<Wallet>,
    secret: &Secret,
    address: Address,
    amt: u64,
    payload: Vec<u8>,
) -> Result<TransactionId> {
    let a = w
        .account()
        .map_err(|e| eyre::eyre!("failed to get account: {}", e))?;

    let dst = PaymentDestination::from(PaymentOutput::new(address, amt));
    let fees = Fees::from(0i64);
    let payment_secret = None;
    let abortable = Abortable::new();

    let (summary, _) = a
        .send(
            dst,
            None,
            fees,
            match payload.len() {
                0 => None,
                _ => Some(payload),
            },
            secret.clone(),
            payment_secret,
            &abortable,
            None,
        )
        .await
        .map_err(|e| eyre::eyre!("failed to send transaction: {}", e))?;

    summary
        .final_transaction_id()
        .ok_or_else(|| eyre::eyre!("transaction did not produce a transaction ID"))
}
