#!/bin/bash

# Full Flow Script for Generating and Paying Asset-Denominated Invoices (Fallback with lncli and tapcli on Testnet4)
# Assumptions:
# - lnd and tapd are installed and running separately on Testnet4 (configured in lnd.conf and tapd.conf).
# - lnd connected to Bitcoin Core on Testnet4.
# - tapd linked to lnd for asset awareness.
# - You have testnet BTC from a faucet.
# - Run this script step-by-step; some commands require manual input (e.g., peer pubkey, invoice).
# - For asset-denominated invoices, use on-chain fallback if Lightning TLVs not supported directly.
# - Replace placeholders like <peer_pubkey> with actual values.

set -e  # Exit on error

echo "Step 0: Verify lnd and tapd Status"
lncli getinfo
tapcli status

echo "Step 1: Generate a New On-Chain Address in lnd (if needed for funding)"
lncli newaddress p2wkh
# Manually send testnet BTC to this address from a faucet.

echo "Step 2: Mint a Test Asset (tapcli)"
tapcli assets mint --type normal --name TestAsset --supply 1000000 --meta_bytes "Hackathon test asset"
tapcli assets mint finalize

echo "Step 3: List Assets to Get ID and Group Key (tapcli)"
tapcli assets list
# Note down <asset_id> and <tweaked_group_key> from output.

echo "Step 4: Connect to a Peer (lncli, replace <peer_pubkey@host:port>)"
# For testing, set up a second node and get its peer info.
lncli connect <peer_pubkey@host:port>

echo "Step 5: Open a Multi-Asset Channel (lncli with Taproot flags, replace <peer_pubkey> and <asset_id>)"
lncli openchannel --node_pubkey <peer_pubkey> --local_amt 100000 --protocol.simple-taproot-chans
# For asset push: Adjust with --push_amt if needed; confirm asset support.
lncli listchannels  # Confirm open (wait until active).

echo "Step 6: Verify Asset Balance in Channel (tapcli)"
tapcli assets balances

echo "Step 7: Generate Asset-Denominated Invoice (Receiver Side Fallback: On-Chain Address via tapcli, replace <asset_id>)"
tapcli addrs new --asset_id <asset_id> --amt 1000
# Note down <encoded_address> as the "invoice" (for on-chain send).
# For Lightning: Use lncli addinvoice --amt <equivalent_sats> --memo "Receive TestAsset" (asset TLVs via gRPC if needed).

echo "Step 8: Decode for Verification (if Lightning invoice)"
# lncli decodepayreq <bolt11_invoice>

echo "Step 9: Pay the Invoice (Payer Side: On-Chain Fallback via tapcli)"
tapcli assets send --addr <encoded_address>
# For Lightning: lncli sendpayment --pay_req <bolt11_invoice> --force

echo "Step 10: Monitor Payment (lncli for Lightning, or tapcli balances)"
lncli listpayments  # For Lightning
tapcli assets balances  # For assets

echo "Step 11: Verify Receiver's Balance (tapcli)"
tapcli assets balances

echo "Flow Complete! For cleanup, close channels: lncli closechannel <chan_point>"

