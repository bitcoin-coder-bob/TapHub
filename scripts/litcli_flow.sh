#!/bin/bash

# Full Flow Script for Generating and Paying Asset-Denominated Invoices on Testnet4
# Assumptions:
# - litd is installed and running on Testnet4 (configured in ~/.lit/lit.conf).
# - Bitcoin Core is running on Testnet4 with RPC setup.
# - You have testnet BTC from a faucet.
# - Run this script step-by-step; some commands require manual input (e.g., peer pubkey, invoice).
# - Replace placeholders like <peer_pubkey> with actual values.
# - For demo: Run on one machine or use two terminals for payer/receiver simulation.

set -e  # Exit on error

echo "Step 0: Verify litd Status"
litcli status

echo "Step 1: Generate a New On-Chain Address (if needed for funding)"
litcli wallet addresses new
# Manually send testnet BTC to this address from a faucet.

echo "Step 2: Mint a Test Asset (e.g., TestAsset)"
litcli assets mint --type normal --name TestAsset --supply 1000000 --meta_bytes "Hackathon test asset"
litcli assets mint finalize

echo "Step 3: List Assets to Get ID and Group Key"
litcli assets list
# Note down <asset_id> and <tweaked_group_key> from output.

echo "Step 4: Connect to a Peer (replace <peer_pubkey@host:port> with actual)"
# For testing, set up a second litd node and get its peer info.
litcli nodes connect <peer_pubkey@host:port>

echo "Step 5: Open a Multi-Asset Channel (replace <peer_pubkey> and <asset_id>)"
litcli channels open --node_key <peer_pubkey> --local_amt 100000 --asset_id <asset_id> --asset_amt 500000

echo "Step 6: Confirm Channel is Open"
litcli channels list
# Wait until status is active (may take a few minutes on Testnet4).

echo "Step 7: Generate Asset-Denominated Invoice (Receiver Side, replace <tweaked_group_key>)"
litcli ln addinvoice --memo "Receive TestAsset" --group_key <tweaked_group_key> --asset_amount 1000 --expiry 3600
# Note down the <bolt11_invoice> from output.

echo "Step 8: Decode Invoice for Verification (optional)"
litcli ln decodepayreq <bolt11_invoice>

echo "Step 9: Check Payer's Asset Balance"
litcli assets balances

echo "Step 10: Pay the Invoice (Payer Side)"
litcli ln payinvoice --pay_req <bolt11_invoice> --force=true

echo "Step 11: Monitor Payment"
litcli ln listpayments --reversed

echo "Step 12: Verify Receiver's Balance"
litcli assets balances

echo "Flow Complete! For cleanup, close channels if needed: litcli channels close <chan_point>"

