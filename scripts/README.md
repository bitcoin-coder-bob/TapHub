# TapHub Scripts

Demo scripts for Lightning Network and Taproot Assets trading platform.

## Demo Flow

The demo showcases a complete asset trading flow between Alice and Bob:

### Part 1: Edge Node Registration (1 min)
- Bob mints BobBux asset
- Sets pricing and availability
- Registers on TapHub marketplace

### Part 2: User Journey (3 min)  
- Alice browses marketplace
- Opens Lightning channel to Bob
- TapHub detects channel confirmation
- Bob creates asset receive address
- Asset purchase executed via Lightning payment
- Real asset transfer: Bob → Alice

### Part 3: Reverse Flow (1 min)
- Alice sells assets back for sats
- Lightning payment received
- Asset transfer: Alice → Bob

## Quick Start

```bash
# Run the demo
./taphub_demo.sh

# Test node connections
./config.sh
```

## CLI Reference

### Node Management
```bash
# Get node info
lncli_alice getinfo
lncli_bob getinfo
lncli_carol getinfo

# Check balances
lncli_alice walletbalance
tapcli_alice assets balance
```

### Asset Operations
```bash
# Mint new asset
tapcli_bob assets mint --type normal --name "AssetName" --supply 1000000 --meta_bytes "Description"
tapcli_bob assets mint finalize

# List assets
tapcli_alice assets list
tapcli_bob assets balance

# Generate receive address
tapcli_alice addrs new --asset_id ASSET_ID --amt 100

# Send assets
tapcli_bob assets send --addr ENCODED_ADDRESS
```

### Lightning Operations
```bash
# Connect nodes
lncli_alice connect PUBKEY@HOST:PORT

# Open channel
lncli_alice openchannel --node_key PUBKEY --local_amt 1000000 --push_amt 200000

# Create invoice
lncli_alice addinvoice --memo "Description" --amt 10000

# Pay invoice
lncli_bob payinvoice --pay_req BOLT11_INVOICE --force

# List channels
lncli_alice listchannels
lncli_alice listpeers
```

### Channel Management
```bash
# Check channel status
lncli_alice listchannels
lncli_bob listchannels

# Monitor payments
lncli_alice listpayments
lncli_bob listinvoices
```

## Network Setup

The demo uses a 3-node Polar Lightning Network:

- **Alice**: Has existing assets, acts as buyer/seller
- **Bob**: Mints BobBux, provides liquidity  
- **Carol**: Additional node for price comparison

### Node Configuration
```bash
# Alice
export ALICE_RPC_SERVER="127.0.0.1:10001"
export ALICE_TAP_RPC_SERVER="127.0.0.1:12029"

# Bob  
export BOB_RPC_SERVER="127.0.0.1:10002"
export BOB_TAP_RPC_SERVER="127.0.0.1:12032"

# Carol
export CAROL_RPC_SERVER="127.0.0.1:10003"  
export CAROL_TAP_RPC_SERVER="127.0.0.1:12031"
```

## Script Files

- `taphub_demo.sh` - Main demo with complete asset trading flow
- `config.sh` - Multi-node configuration and helper functions
- `polar_litcli_flow.sh` - Original litcli flow reference
- `polar_lncli_flow.sh` - Original lncli flow reference

## Requirements

- Lightning Network Daemon (lnd)
- Taproot Assets Daemon (tapd)  
- Bitcoin Core (regtest mode)
- jq (JSON processor)
- Polar Lightning Network setup

## Flow Architecture

```
Alice                    TapHub                    Bob
  |                        |                       |
  |-- Opens LN Channel --->|                       |
  |                        |<-- Detects Channel ---|
  |                        |-- Notifies Bob ------>|
  |<-- Asset Address ------|<-- Creates Address ---|
  |-- Lightning Payment -->|-- Forwards Payment -->|
  |<-- Asset Transfer -----|<-- Sends Assets ------|
```

The platform coordinates Lightning payments with Taproot Asset transfers, enabling atomic swaps between different asset types through Lightning Network infrastructure.