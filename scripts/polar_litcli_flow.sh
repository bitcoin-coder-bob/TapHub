#!/bin/bash

# Full Flow Script for Polar Lightning Network setup

set -e  # Exit on error

# Source the configuration
source "$(dirname "$0")/config.sh"

echo "Step 0: Verify litd Status (using lncli + tapcli)"
lncli_alice getinfo | jq -r '.alias'
tapcli_alice assets list | jq -r '.assets | length'

echo -e "\nStep 1: Generate a New On-Chain Address (if needed for funding)"
lncli_alice newaddress p2wkh

echo -e "\nStep 2: List existing assets"
tapcli_alice assets list | jq -r '.assets[] | "\(.asset_genesis.name): \(.asset_genesis.asset_id) (amount: \(.amount))"'

echo -e "\nStep 3: Get first available asset info"
ASSET_INFO=$(tapcli_alice assets list | jq -r '.assets[0]')
ASSET_ID=$(echo "$ASSET_INFO" | jq -r '.asset_genesis.asset_id')
ASSET_NAME=$(echo "$ASSET_INFO" | jq -r '.asset_genesis.name')
echo "Using asset: $ASSET_NAME ($ASSET_ID)"

echo -e "\nStep 4: List current peers"
lncli_alice listpeers

echo -e "\nStep 5: List current channels"
lncli_alice listchannels

echo -e "\nStep 6: Generate Asset-Denominated Address (for receiving)"
tapcli_alice addrs new --asset_id "$ASSET_ID" --amt 100

echo -e "\nStep 7: Check Asset Balance"
tapcli_alice assets balance

echo -e "\nFlow demonstration complete!"
echo "To test asset transfers:"
echo "1. Use 'tapcli_alice addrs new --asset_id <asset_id> --amt <amount>' to create receive address"
echo "2. Use 'tapcli_alice assets send --addr <encoded_address>' to send assets"
