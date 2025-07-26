# Alby Integration for TapHub

This document describes the Alby authentication and payment integration implemented in the TapHub Lightning Network marketplace.

## Overview

TapHub uses Alby's JavaScript SDK to provide:
- **Authentication**: Users connect their Lightning wallets via Nostr Wallet Connect (NWC)
- **Node Registration**: Lightning node operators can register to list Taproot Assets
- **Payments**: Instant Lightning Network payments for asset purchases

## Features

### 1. Alby Authentication
- **User Authentication**: Connect any NWC-enabled wallet (Alby, coinos, Primal, etc.)
- **Node Registration**: Lightning node operators can register to sell assets
- **Persistent Sessions**: Authentication state is saved in localStorage
- **Secure Credentials**: NWC credentials are stored locally

### 2. Payment Processing
- **Instant Payments**: Lightning Network payments for asset purchases
- **Zero Custody**: Users maintain full control of their funds
- **Low Fees**: Minimal Lightning Network transaction fees
- **Real-time Settlement**: Assets transferred immediately after payment

### 3. Node Management
- **Setup Guide**: Step-by-step instructions for node operators
- **Asset Listing**: Node runners can list Taproot Assets for sale
- **Dashboard**: Manage listings and track sales

## Technical Implementation

### Authentication Service (`albyAuth.ts`)

```typescript
// Connect with Alby wallet
const user = await albyAuth.connectWithAlby(nwcCredentials);

// Register as a node runner
const nodeUser = await albyAuth.registerAsNode({
  pubkey: "node_pubkey",
  alias: "My Node",
  credentials: nwcCredentials
});

// Make payments
await albyAuth.makePayment(lightningInvoice);

// Request payments
const request = await albyAuth.requestPayment(USD(1.0));
```

### Components

1. **LoginPage**: Alby wallet connection interface
2. **RegisterNodePage**: Node registration with setup guide
3. **AlbyPaymentDemo**: Payment processing component
4. **Navigation**: Updated to show Alby user status

## Setup Instructions

### For Users

1. **Get NWC Credentials**:
   - Visit [Alby Hub](https://nwc.getalby.com/)
   - Connect your Lightning wallet
   - Copy the NWC connection string

2. **Connect to TapHub**:
   - Go to the login page
   - Paste your NWC credentials
   - Click "Connect Wallet"

3. **Make Purchases**:
   - Browse available Taproot Assets
   - Click "Buy" on desired assets
   - Complete payment with your Alby wallet

### For Node Operators

1. **Setup Requirements**:
   - Running Lightning Network node (LND, Core Lightning, etc.)
   - NWC credentials from your node
   - Taproot Assets to list

2. **Registration Process**:
   - Visit the registration page
   - Follow the setup guide
   - Provide NWC credentials and node details
   - Start listing assets

3. **Asset Management**:
   - Access the seller dashboard
   - Create new asset listings
   - Track sales and payments

## Security Considerations

- **Zero Custody**: TapHub never holds user funds
- **Local Storage**: Credentials stored only in user's browser
- **NWC Protocol**: Secure communication between app and wallet
- **No Server Storage**: Authentication state managed client-side

## Dependencies

```json
{
  "@getalby/sdk": "^5.1.0"
}
```

## API Reference

### AlbyAuthService Methods

- `connectWithAlby(credentials: string)`: Connect wallet
- `registerAsNode(data: NodeRegistrationData)`: Register as node operator
- `getCurrentUser()`: Get current authenticated user
- `isAuthenticated()`: Check authentication status
- `isNodeRunner()`: Check if user is a node operator
- `makePayment(invoice: string)`: Pay Lightning invoice
- `requestPayment(amount: number)`: Request payment
- `logout()`: Sign out and clear credentials

### User Types

```typescript
interface AlbyUser {
  type: 'user' | 'node';
  pubkey: string;
  alias?: string;
  email?: string;
  isNodeRunner?: boolean;
  description?: string;
}
```

## Future Enhancements

1. **Multi-wallet Support**: Support for additional Lightning wallets
2. **Advanced Node Features**: Channel management, liquidity optimization
3. **Payment Analytics**: Detailed transaction history and analytics
4. **Escrow Services**: Secure escrow for high-value assets
5. **API Integration**: REST API for third-party integrations

## Troubleshooting

### Common Issues

1. **Invalid NWC Credentials**:
   - Verify credentials from Alby Hub
   - Check for typos in connection string
   - Ensure wallet is properly connected

2. **Payment Failures**:
   - Check Lightning node connectivity
   - Verify sufficient balance
   - Ensure proper invoice format

3. **Authentication Issues**:
   - Clear browser storage and reconnect
   - Check NWC connection status
   - Verify wallet compatibility

### Support

For technical support or questions about the Alby integration, please refer to:
- [Alby Documentation](https://docs.getalby.com/)
- [Nostr Wallet Connect Spec](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Lightning Network Documentation](https://docs.lightning.engineering/) 