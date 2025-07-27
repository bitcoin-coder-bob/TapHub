# TapHub Scripts

Demo scripts for Lightning Network and Taproot Assets trading platform.

## Requirements

### Prerequisites
- [Polar Lightning Network](https://lightningpolar.com/) installed and running
- 3 LND nodes (Alice, Bob, Carol) configured in Polar
- 3 Taproot Assets daemons (tapd) running alongside each LND node
- Bitcoin Core in regtest mode (configured automatically by Polar)
- jq (JSON processor) - `brew install jq` on macOS

### Polar Network Setup
1. Create new network in Polar with 3 LND nodes
2. Enable Taproot Assets (tapd) for all nodes in Polar settings
3. Start the network and ensure all nodes are running
4. Verify tapd is running: each node should have both LND and TAP ports active

## Demo Flow

The demo showcases a complete asset trading flow between Alice and Bob:

### Part 1: Edge Node Registration (1 min)
- Bob registers as edge runner on TapHub platform
- Proves node ownership through cryptographic verification
- Demonstrates asset minting and receiving capabilities
- Bob mints BobBux asset and sets pricing/availability

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
# Run edge node registration (proves ownership and capabilities)
./edge_node_registration.sh bob

# Run the full demo
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

- `edge_node_registration.sh` - Edge runner registration with ownership verification
- `taphub_demo.sh` - Main demo with complete asset trading flow
- `config.sh` - Multi-node configuration and helper functions
- `polar_litcli_flow.sh` - Original litcli flow reference
- `polar_lncli_flow.sh` - Original lncli flow reference

### Edge Node Registration

The `edge_node_registration.sh` script guides users through proving ownership of their Lightning Node and registering as a TapHub edge runner:

```bash
# Register Bob's node
./edge_node_registration.sh bob

# Register Alice's node  
./edge_node_registration.sh alice

# Register Carol's node
./edge_node_registration.sh carol
```

**What it does:**
- Verifies Lightning Node and Taproot Assets connectivity
- Checks node capabilities (channels, balance, assets)
- Signs cryptographic challenge to prove node ownership
- Tests asset minting and receiving capabilities
- Generates JSON registration file with ownership proof
- Provides verification data for TapHub platform submission

**Key lncli/tapd commands demonstrated:**
- `lncli getinfo` - Node status and public key
- `lncli signmessage` / `lncli verifymessage` - Ownership proof
- `lncli listchannels` / `lncli walletbalance` - Capability assessment
- `tapcli assets list` / `tapcli assets mint` - Asset operations
- `tapcli addrs new` - Address generation testing

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