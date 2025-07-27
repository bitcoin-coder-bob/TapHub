#!/bin/bash

# Configuration for Polar Lightning Network setup
export PATH="$HOME/bin:$PATH"

# Alice node configuration
export ALICE_RPC_SERVER="127.0.0.1:10001"
export ALICE_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/lnd/alice/tls.cert"
export ALICE_MACAROON="/Users/kyle/.polar/networks/1/volumes/lnd/alice/data/chain/bitcoin/regtest/admin.macaroon"

# Alice TAP configuration
export ALICE_TAP_RPC_SERVER="127.0.0.1:12029"
export ALICE_TAP_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/tapd/alice-tap/tls.cert"
export ALICE_TAP_MACAROON="/Users/kyle/.polar/networks/1/volumes/tapd/alice-tap/data/regtest/admin.macaroon"

# Bob node configuration
export BOB_RPC_SERVER="127.0.0.1:10002"
export BOB_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/lnd/bob/tls.cert"
export BOB_MACAROON="/Users/kyle/.polar/networks/1/volumes/lnd/bob/data/chain/bitcoin/regtest/admin.macaroon"

# Bob TAP configuration
export BOB_TAP_RPC_SERVER="127.0.0.1:12032"
export BOB_TAP_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/tapd/bob-tap/tls.cert"
export BOB_TAP_MACAROON="/Users/kyle/.polar/networks/1/volumes/tapd/bob-tap/data/regtest/admin.macaroon"

# Carol node configuration
export CAROL_RPC_SERVER="127.0.0.1:10003"
export CAROL_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/lnd/carol/tls.cert"
export CAROL_MACAROON="/Users/kyle/.polar/networks/1/volumes/lnd/carol/data/chain/bitcoin/regtest/admin.macaroon"

# Carol TAP configuration
export CAROL_TAP_RPC_SERVER="127.0.0.1:12031"
export CAROL_TAP_TLS_CERT="/Users/kyle/.polar/networks/1/volumes/tapd/carol-tap/tls.cert"
export CAROL_TAP_MACAROON="/Users/kyle/.polar/networks/1/volumes/tapd/carol-tap/data/regtest/admin.macaroon"

# Convenience functions for each node
lncli_alice() {
    lncli --rpcserver=$ALICE_RPC_SERVER --tlscertpath="$ALICE_TLS_CERT" --macaroonpath="$ALICE_MACAROON" "$@"
}

tapcli_alice() {
    tapcli --rpcserver=$ALICE_TAP_RPC_SERVER --tlscertpath="$ALICE_TAP_TLS_CERT" --macaroonpath="$ALICE_TAP_MACAROON" "$@"
}

lncli_bob() {
    lncli --rpcserver=$BOB_RPC_SERVER --tlscertpath="$BOB_TLS_CERT" --macaroonpath="$BOB_MACAROON" "$@"
}

tapcli_bob() {
    tapcli --rpcserver=$BOB_TAP_RPC_SERVER --tlscertpath="$BOB_TAP_TLS_CERT" --macaroonpath="$BOB_TAP_MACAROON" "$@"
}

lncli_carol() {
    lncli --rpcserver=$CAROL_RPC_SERVER --tlscertpath="$CAROL_TLS_CERT" --macaroonpath="$CAROL_MACAROON" "$@"
}

tapcli_carol() {
    tapcli --rpcserver=$CAROL_TAP_RPC_SERVER --tlscertpath="$CAROL_TAP_TLS_CERT" --macaroonpath="$CAROL_TAP_MACAROON" "$@"
}

# Test connections function
test_connections() {
    echo "Testing node connections..."
    echo "Alice: $(lncli_alice getinfo | jq -r '.alias')"
    echo "Bob: $(lncli_bob getinfo | jq -r '.alias')"
    echo "Carol: $(lncli_carol getinfo | jq -r '.alias')"
    echo "Alice TAP assets: $(tapcli_alice assets list | jq -r '.assets | length')"
    echo "Bob TAP assets: $(tapcli_bob assets list | jq -r '.assets | length')"
    echo "Carol TAP assets: $(tapcli_carol assets list | jq -r '.assets | length')"
}

# Only run tests if this script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    test_connections
fi