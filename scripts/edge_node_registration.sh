#!/bin/bash

# TapHub Edge Node Registration Flow
# This script guides users through registering their Lightning Node as an edge runner
# and proving ownership through cryptographic verification

set -e

# Source the config for Polar network
source "$(dirname "$0")/config.sh"

# Use Bob's node for the demo
NODE_TYPE=${1:-bob}
case $NODE_TYPE in
    alice)
        lncli_cmd="lncli_alice"
        tapcli_cmd="tapcli_alice"
        ;;
    bob)
        lncli_cmd="lncli_bob"
        tapcli_cmd="tapcli_bob"
        ;;
    carol)
        lncli_cmd="lncli_carol"
        tapcli_cmd="tapcli_carol"
        ;;
    *)
        echo "Usage: $0 [alice|bob|carol]"
        echo "Defaulting to Bob's node..."
        lncli_cmd="lncli_bob"
        tapcli_cmd="tapcli_bob"
        ;;
esac

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if lncli is available
check_lncli() {
    if ! command -v lncli &> /dev/null; then
        print_error "lncli not found. Please install LND and ensure lncli is in your PATH"
        exit 1
    fi
    print_success "lncli found"
}

# Check if tapcli is available
check_tapcli() {
    if ! command -v tapcli &> /dev/null; then
        print_error "tapcli not found. Please install Taproot Assets daemon and ensure tapcli is in your PATH"
        exit 1
    fi
    print_success "tapcli found"
}

# Check node connectivity
check_node_status() {
    print_step "Checking Lightning Node Status ($NODE_TYPE)"
    
    if ! $lncli_cmd getinfo &> /dev/null; then
        print_error "Cannot connect to LND. Please ensure your node is running and properly configured"
        print_info "Check your LND configuration and macaroon permissions"
        exit 1
    fi
    
    NODE_INFO=$($lncli_cmd getinfo)
    NODE_PUBKEY=$(echo "$NODE_INFO" | jq -r '.identity_pubkey')
    NODE_ALIAS=$(echo "$NODE_INFO" | jq -r '.alias // "Unknown"')
    SYNCED=$(echo "$NODE_INFO" | jq -r '.synced_to_chain')
    
    print_success "Connected to Lightning Node"
    echo "  Node Alias: $NODE_ALIAS"
    echo "  Public Key: $NODE_PUBKEY"
    echo "  Synced to Chain: $SYNCED"
    
    if [ "$SYNCED" != "true" ]; then
        print_warning "Node is not fully synced to the blockchain"
        print_info "Please wait for your node to sync before proceeding"
        exit 1
    fi
}

# Check tapd status
check_tapd_status() {
    print_step "Checking Taproot Assets Daemon Status"
    
    if ! $tapcli_cmd assets list &> /dev/null; then
        print_error "Cannot connect to tapd. Please ensure Taproot Assets daemon is running"
        print_info "Start tapd with: tapd --network=mainnet (or testnet/regtest)"
        exit 1
    fi
    
    TAPD_INFO=$($tapcli_cmd getinfo)
    TAPD_VERSION=$(echo "$TAPD_INFO" | jq -r '.version // "Unknown"')
    
    print_success "Connected to Taproot Assets Daemon"
    echo "  Version: $TAPD_VERSION"
}

# Get node capabilities
check_capabilities() {
    print_step "Checking Node Capabilities"
    
    # Check channel capacity
    CHANNELS=$($lncli_cmd listchannels)
    CHANNEL_COUNT=$(echo "$CHANNELS" | jq '.channels | length')
    TOTAL_CAPACITY=$(echo "$CHANNELS" | jq '.channels | map(.capacity | tonumber) | add // 0')
    
    # Check wallet balance
    WALLET_BALANCE=$($lncli_cmd walletbalance | jq '.confirmed_balance | tonumber // 0')
    
    # Check asset inventory
    ASSETS=$($tapcli_cmd assets list)
    ASSET_COUNT=$(echo "$ASSETS" | jq '.assets | length // 0')
    
    print_success "Node Capabilities Assessment"
    echo "  Active Channels: $CHANNEL_COUNT"
    echo "  Total Channel Capacity: $TOTAL_CAPACITY sats"
    echo "  Wallet Balance: $WALLET_BALANCE sats"
    echo "  Asset Types: $ASSET_COUNT"
    
    # Minimum requirements check
    if [ "$CHANNEL_COUNT" -lt 1 ]; then
        print_warning "No active channels found. Edge runners typically need at least 1 active channel"
    fi
    
    if [ "$WALLET_BALANCE" -lt 100000 ]; then
        print_warning "Low wallet balance. Consider having at least 100,000 sats for channel management"
    fi
}

# Sign ownership message
sign_ownership_message() {
    print_step "Proving Node Ownership"
    
    TIMESTAMP=$(date +%s)
    CHALLENGE_MESSAGE="TapHub Edge Node Registration - Node: $NODE_PUBKEY - Timestamp: $TIMESTAMP"
    
    print_info "Signing challenge message to prove node ownership..."
    echo "Challenge: $CHALLENGE_MESSAGE"
    
    # Sign the message with the node's private key
    SIGNATURE=$($lncli_cmd signmessage "$CHALLENGE_MESSAGE" | jq -r '.signature')
    
    print_success "Message signed successfully"
    echo "Signature: $SIGNATURE"
    
    # Verify the signature
    print_info "Verifying signature..."
    VERIFICATION=$($lncli_cmd verifymessage "$CHALLENGE_MESSAGE" "$SIGNATURE" | jq -r '.valid')
    
    if [ "$VERIFICATION" = "true" ]; then
        print_success "Signature verification passed"
    else
        print_error "Signature verification failed"
        exit 1
    fi
    
    # Store registration data
    REGISTRATION_DATA=$(cat <<EOF
{
  "node_pubkey": "$NODE_PUBKEY",
  "node_alias": "$NODE_ALIAS", 
  "timestamp": $TIMESTAMP,
  "challenge_message": "$CHALLENGE_MESSAGE",
  "signature": "$SIGNATURE",
  "capabilities": {
    "channel_count": $CHANNEL_COUNT,
    "total_capacity": $TOTAL_CAPACITY,
    "wallet_balance": $WALLET_BALANCE,
    "asset_types": $ASSET_COUNT
  }
}
EOF
)
    
    echo "$REGISTRATION_DATA" > "edge_node_registration_$(date +%Y%m%d_%H%M%S).json"
    print_success "Registration data saved to edge_node_registration_$(date +%Y%m%d_%H%M%S).json"
}

# Generate asset proof
generate_asset_proof() {
    print_step "Generating Asset Capability Proof"
    
    # Check if node can mint assets
    print_info "Testing asset minting capability..."
    
    # Create a test asset (this would be on testnet/regtest)
    TEST_ASSET_NAME="TapHub-Test-$(date +%s)"
    
    print_info "Attempting to mint test asset: $TEST_ASSET_NAME"
    print_warning "This creates a small test asset to prove minting capability"
    
    # Mint test asset with minimal supply
    MINT_RESULT=$($tapcli_cmd assets mint --type normal --name "$TEST_ASSET_NAME" --supply 1 --meta_bytes "TapHub edge node capability test" 2>/dev/null || echo "failed")
    
    if [ "$MINT_RESULT" = "failed" ]; then
        print_warning "Asset minting test failed - node may not have minting capability"
        ASSET_MINT_CAPABLE=false
    else
        # Finalize the mint
        $tapcli_cmd assets mint finalize &> /dev/null || true
        print_success "Asset minting capability confirmed"
        ASSET_MINT_CAPABLE=true
    fi
    
    # Check receive address generation capability
    print_info "Testing asset receive address generation..."
    
    # Get any existing asset to test address generation
    EXISTING_ASSETS=$($tapcli_cmd assets list)
    if [ "$(echo "$EXISTING_ASSETS" | jq '.assets | length')" -gt 0 ]; then
        FIRST_ASSET_ID=$(echo "$EXISTING_ASSETS" | jq -r '.assets[0].asset_genesis.asset_id')
        
        # Generate receive address
        RECEIVE_ADDR=$($tapcli_cmd addrs new --asset_id "$FIRST_ASSET_ID" --amt 1 2>/dev/null || echo "failed")
        
        if [ "$RECEIVE_ADDR" = "failed" ]; then
            print_warning "Asset address generation failed"
            ASSET_RECEIVE_CAPABLE=false
        else
            print_success "Asset receive address generation capability confirmed"
            ASSET_RECEIVE_CAPABLE=true
        fi
    else
        print_info "No existing assets found - cannot test receive address generation"
        ASSET_RECEIVE_CAPABLE="unknown"
    fi
    
    # Update registration data with asset capabilities
    ASSET_CAPABILITIES=$(cat <<EOF
{
  "can_mint_assets": $ASSET_MINT_CAPABLE,
  "can_receive_assets": "$ASSET_RECEIVE_CAPABLE",
  "test_asset_created": "$TEST_ASSET_NAME"
}
EOF
)
    
    print_success "Asset capability assessment complete"
    echo "  Can Mint Assets: $ASSET_MINT_CAPABLE"
    echo "  Can Receive Assets: $ASSET_RECEIVE_CAPABLE"
}

# Registration submission
submit_registration() {
    print_step "Registration Summary"
    
    echo "Node Registration Details:"
    echo "  Public Key: $NODE_PUBKEY"
    echo "  Alias: $NODE_ALIAS"
    echo "  Channels: $CHANNEL_COUNT"
    echo "  Capacity: $TOTAL_CAPACITY sats"
    echo "  Asset Mint Capable: $ASSET_MINT_CAPABLE"
    echo "  Asset Receive Capable: $ASSET_RECEIVE_CAPABLE"
    
    print_info "Next Steps:"
    echo "1. Submit the generated registration JSON to TapHub platform"
    echo "2. Wait for approval and edge runner onboarding"
    echo "3. Configure your node for TapHub integration"
    echo "4. Start earning fees as an edge runner!"
    
    print_warning "Keep your registration JSON file secure - it contains your ownership proof"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║              TapHub Edge Node Registration           ║"
    echo "║                                                      ║"
    echo "║   Prove ownership and register your Lightning Node  ║"
    echo "║          as a TapHub edge runner                     ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    print_info "This script will:"
    echo "  • Verify your Lightning Node and Taproot Assets setup"
    echo "  • Check node capabilities and requirements"
    echo "  • Generate cryptographic proof of node ownership"
    echo "  • Create registration data for TapHub platform"
    echo ""
    
    read -p "Continue with registration? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Registration cancelled"
        exit 0
    fi
    
    # Execute registration steps
    check_lncli
    check_tapcli
    check_node_status
    check_tapd_status
    check_capabilities
    sign_ownership_message
    generate_asset_proof
    submit_registration
    
    print_success "Edge node registration process complete!"
}

# Run main function
main "$@"