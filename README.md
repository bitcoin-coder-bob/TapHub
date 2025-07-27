# TapHub

## Executive Summary

Taphub is a marketplace platform that connects Taproot Asset providers (Edge nodes) with users who want to buy or swap assets. Think of it as Lightning Network Plus but for discovering and trading Taproot Assets instead of liquidity swaps.

## Problem Statement

**Discovery**: No centralized place to find which Lightning nodes offer Taproot Assets

**Trust**: No way to verify asset availability or provider reputation

**UX**: Complex technical process to buy/swap Taproot Assets

## Solution

A web platform where:

- Edge nodes list their Taproot Assets with pricing
- Users browse available assets and providers
- Simple one-click purchase flow using Lightning payments
- Reputation system for asset providers

## Development Setup

### Prerequisites
- Install [Polar](https://lightningpolar.com/) for Lightning Network regtest setup
- Create a new network with at least one node (Alice with LND + TAP enabled)
- For full testing: Add Bob and Carol nodes (with LND + TAP enabled for both)
- Start the network and ensure nodes are running

### Go Backend
```bash
# Update paths to match your Polar network setup
go run cmd/server/main.go -port 8082 -rpcserverLnd 127.0.0.1:10001 -rpcserverTap 127.0.0.1:12029 -tap-tlscertPath "/Users/[user]/.polar/networks/1/volumes/tapd/alice-tap/tls.cert" -tap-macaroonPath "/Users/[user]/.polar/networks/1/volumes/tapd/alice-tap/data/regtest/admin.macaroon" -lnd-tlscertPath "/Users/[user]/.polar/networks/1/volumes/lnd/alice/tls.cert" -lnd-macaroonPath "/Users/[user]/.polar/networks/1/volumes/lnd/alice/data/chain/bitcoin/regtest/admin.macaroon" -network regtest
```

### Frontend
```bash
cd frontend
bun i
bun run dev
```
