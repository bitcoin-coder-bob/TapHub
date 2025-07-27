# TapHub Architecture

## Overview

TapHub is a marketplace for Lightning Network Taproot Assets trading, enabling users to discover asset-enabled edge nodes and facilitate asset channel creation between peers.

## Architecture Diagram

```mermaid
graph TB
    subgraph "TapHub Platform"
        WEB[Web Frontend - Marketplace UI]
        API[TapHub API - Node Registry]
        MONITOR[Blockchain Monitor - Channel Detection]
        DB[(Database - Node Registry & Asset Listings)]
    end

    subgraph "Lightning Network"
        ALICE[Alice Node - Has Sats, Wants Assets]
        BOB[Bob Node - Edge Node Has BobBux]
        NODE_C[Node C - Has USD Token @ 95 sats/unit]
    end

    subgraph "Blockchain"
        BTC[Bitcoin Blockchain - Channel Opens]
        TAP[Taproot Assets - Asset Transfers]
    end

    %% User interactions
    ALICE -.->|1. Browse Marketplace| WEB
    WEB -.->|2. Search Assets| API
    API -.->|3. Return Listings| WEB
    
    %% Channel opening flow
    ALICE -->|4. Open Sats Channel| BOB
    ALICE -.->|5. Request Asset Channel| API
    
    %% Monitoring
    BTC -->|6. Detect Channel Open| MONITOR
    MONITOR -->|7. Notify Bob| API
    
    %% Asset channel
    BOB -->|8. Open Asset Channel| ALICE
    BOB -.->|9. Confirm Channel Open| API
    
    %% Trading
    ALICE <-->|10. Lightning Payments| BOB
    ALICE <-->|11. Asset Transfers| BOB
    
    %% Database connections
    API <--> DB
    MONITOR --> DB
    
    style WEB fill:#e1f5fe
    style API fill:#f3e5f5
    style MONITOR fill:#fff3e0
    style DB fill:#e8f5e9
    style ALICE fill:#ffebee
    style BOB fill:#ffebee
    style NODE_C fill:#ffebee
    style BTC fill:#fffde7
    style TAP fill:#fffde7
```

## Detailed Flow

### 1. Edge Node Registration (Bob's Setup)
```mermaid
sequenceDiagram
    participant Bob as Bob Node
    participant TAP as Taproot Assets
    participant TH as TapHub API
    participant DB as Database

    Bob->>TAP: Mint BobBux (1M units)
    TAP-->>Bob: Asset ID returned
    Bob->>TH: Register node
    Bob->>TH: List asset (BobBux @ 100 sats/unit)
    TH->>DB: Store listing
    TH-->>Bob: Listing confirmed
```

### 2. User Discovery & Channel Opening (Alice's Journey)
```mermaid
sequenceDiagram
    participant Alice as Alice Node
    participant UI as TapHub UI
    participant API as TapHub API
    participant Mon as Chain Monitor
    participant Bob as Bob Node
    participant BTC as Bitcoin Network

    Alice->>UI: Browse marketplace
    UI->>API: Search "USD Stablecoin"
    API-->>UI: Show listings (Bob, Node C)
    Alice->>UI: Select Bob's BobBux
    Alice->>Bob: Open Lightning channel (1M sats)
    Alice->>API: Signal asset channel request
    BTC->>Mon: Channel open detected
    Mon->>API: Notify channel: Alice→Bob
    API->>Bob: Alert: Asset channel requested
```

### 3. Asset Channel Creation & Trading
```mermaid
sequenceDiagram
    participant Alice as Alice Node
    participant Bob as Bob Node
    participant LN as Lightning Network
    participant TAP as Taproot Assets
    participant API as TapHub API

    Bob->>TAP: Create asset address
    Bob->>Alice: Open asset channel
    Bob->>API: Confirm channel opened
    Alice->>LN: Create invoice (10k sats)
    Bob->>LN: Pay invoice
    Bob->>TAP: Send 100 BobBux
    TAP->>Alice: Receive 100 BobBux
    Alice->>API: Confirm receipt
```

## Component Details

### TapHub Web Frontend
- **Purpose**: User interface for asset discovery and trading
- **Features**:
  - Asset marketplace browsing
  - Price comparison
  - Channel request initiation
  - Transaction history

### TapHub API
- **Purpose**: Backend services for node registry and coordination
- **Features**:
  - Node registration
  - Asset listing management
  - Channel request handling
  - User authentication

### Blockchain Monitor
- **Purpose**: Detect on-chain channel opens between registered nodes
- **Features**:
  - Mempool scanning
  - Channel open detection
  - Automated notifications
  - State tracking

### Database
- **Purpose**: Persistent storage for platform data
- **Stores**:
  - Registered nodes (pubkeys)
  - Asset listings
  - Channel requests
  - Transaction history

## Key Interactions

### 1. Asset Discovery
Users browse available assets across multiple edge nodes, comparing:
- Asset types
- Pricing (sats per unit)
- Availability
- Channel requirements

### 2. Channel Coordination
TapHub facilitates the two-channel flow:
1. **Sats Channel**: Alice → Bob (detectable on-chain)
2. **Asset Channel**: Bob → Alice (off-chain, requires manual confirmation)

### 3. Trading Execution
- Lightning payments for asset purchases
- Taproot asset transfers
- Bidirectional trading support

## Security Considerations

1. **Trust Model**: Users must trust edge nodes for asset delivery
2. **Channel Detection**: Only registered nodes can be monitored
3. **Asset Verification**: Users confirm asset channel receipt
4. **Payment Atomicity**: Lightning payments are atomic, but asset delivery requires trust

## Technical Stack

- **Frontend**: Web interface for marketplace
- **Backend**: API for node coordination
- **Lightning**: LND for payment channels
- **Assets**: Taproot Assets Protocol (TAP)
- **Monitoring**: Bitcoin blockchain scanning
- **Database**: Node and asset registry