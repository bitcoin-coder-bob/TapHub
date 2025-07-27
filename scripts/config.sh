#!/bin/bash

# Configuration for Polar Lightning Network setup
export PATH="$HOME/bin:$PATH"

# LND Configuration (Alice node)
export LND_RPC_SERVER="127.0.0.1:10001"
export LND_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/lnd/alice/tls.cert"
export LND_MACAROON="/Users/kyle/.polar/networks/1/volumes/lnd/alice/data/chain/bitcoin/regtest/admin.macaroon"

# TAP Configuration (Alice-tap node) 
export TAP_RPC_SERVER="127.0.0.1:12029"
export TAP_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/tapd/alice-tap/tls.cert"
export TAP_MACAROON="/Users/kyle/.polar/networks/1/volumes/tapd/alice-tap/data/regtest/admin.macaroon"

# Convenience functions
lncli_alice() {
    lncli --rpcserver=$LND_RPC_SERVER --tlscertpath="$LND_TLS_CERT" --macaroonpath="$LND_MACAROON" "$@"
}

tapcli_alice() {
    tapcli --rpcserver=$TAP_RPC_SERVER --tlscertpath="$TAP_TLS_CERT" --macaroonpath="$TAP_MACAROON" "$@"
}

# Test connections
echo "Testing LND connection..."
lncli_alice getinfo | jq -r '.alias'

echo "Testing TAP connection..."
tapcli_alice assets list | jq -r '.assets | length'
echo "Assets found in TAP node"