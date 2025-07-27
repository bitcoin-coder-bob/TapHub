# NIP-47 Payment Invoices for Taproot Assets with Alby

This guide explains how to use NIP-47 (Nostr Wallet Connect) for processing Taproot asset payments using Alby integration in TapHub.

## Overview

NIP-47 enables secure communication between clients and Lightning wallets through encrypted Nostr messages. When combined with Taproot assets, it provides a seamless way to purchase and transfer assets using Lightning Network payments.

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   TapHub App    │    │   Alby Wallet    │    │ Taproot Assets  │
│   (Client)      │◄──►│   (NWC Service)  │◄──►│   (Node)        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                       │                       │
        │ NIP-47 Messages       │ Lightning Network     │ Asset Transfer
        │ (Encrypted)           │ (BOLT11 Invoices)     │ (On-chain)
        └───────────────────────┴───────────────────────┘
```

## How It Works

### 1. **Taproot Asset Invoice Generation**

When a user wants to purchase Taproot assets:

1. **Asset Selection**: User selects an asset and quantity
2. **Invoice Request**: TapHub requests a Taproot asset invoice from the seller's node
3. **Lightning Invoice**: The Taproot assets node generates a Lightning invoice with asset routing hints
4. **Payment Processing**: User pays the Lightning invoice via NIP-47

### 2. **NIP-47 Payment Flow**

```typescript
// 1. Generate Taproot asset invoice
const taprootInvoice = await fetch('/api/createInvoice', {
  method: 'POST',
  body: JSON.stringify({
    assetId: 'base64_encoded_asset_id',
    assetAmount: '1000',
    peerPubkey: 'seller_node_pubkey'
  })
});

// 2. Extract Lightning invoice from response
const { invoice_result } = await taprootInvoice.json();
const lightningInvoice = invoice_result.invoice;

// 3. Pay using NIP-47
const paymentResult = await albyAuth.makePayment(lightningInvoice);
```

### 3. **Asset Transfer**

After successful payment:
1. **Payment Confirmation**: Lightning payment is confirmed
2. **Asset Transfer**: Taproot assets are transferred to buyer's wallet
3. **Settlement**: Transaction is settled on the Bitcoin blockchain

## Implementation Details

### AlbyAuthService Methods

#### `makeTaprootAssetPayment(assetId, assetAmount, peerPubkey)`

```typescript
async makeTaprootAssetPayment(
  assetId: string, 
  assetAmount: string, 
  peerPubkey?: string
): Promise<{
  invoice: string;
  payment_hash: string;
  accepted_buy_quote?: Record<string, unknown>;
}> {
  // 1. Generate Taproot asset invoice
  const taprootInvoiceResponse = await fetch('/api/createInvoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assetId, assetAmount, peerPubkey })
  });

  // 2. Extract Lightning invoice
  const taprootInvoiceData = await taprootInvoiceResponse.json();
  const lightningInvoice = taprootInvoiceData.invoice_result?.invoice;

  // 3. Pay using NIP-47
  const paymentResult = await this.lnClient!.pay(lightningInvoice);

  return {
    invoice: lightningInvoice,
    payment_hash: paymentResult.preimage || '',
    accepted_buy_quote: taprootInvoiceData.accepted_buy_quote
  };
}
```

#### `createTaprootAssetInvoice(assetId, assetAmount, description, peerPubkey)`

For sellers to create invoices:

```typescript
async createTaprootAssetInvoice(
  assetId: string,
  assetAmount: string,
  description?: string,
  peerPubkey?: string
): Promise<{
  invoice: string;
  payment_hash: string;
  accepted_buy_quote?: Record<string, unknown>;
}> {
  // Generate Taproot asset invoice for selling
  const response = await fetch('/api/createInvoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetId,
      assetAmount,
      peerPubkey,
      description
    })
  });

  const data = await response.json();
  
  return {
    invoice: data.invoice_result?.invoice || '',
    payment_hash: data.invoice_result?.payment_hash || '',
    accepted_buy_quote: data.accepted_buy_quote
  };
}
```

### TaprootAssetPayment Component

The `TaprootAssetPayment` component provides a complete UI for purchasing Taproot assets:

```typescript
<TaprootAssetPayment
  assetId="base64_encoded_asset_id"
  assetName="Gaming Credits"
  assetAmount="1000"
  price={250} // in sats
  peerPubkey="seller_node_pubkey"
  onSuccess={(result) => {
    console.log('Asset purchased:', result);
  }}
  onCancel={() => {
    console.log('Purchase cancelled');
  }}
/>
```

## NIP-47 Event Flow

### 1. **Info Event (kind 13194)**

The wallet service publishes its capabilities:

```json
{
  "kind": 13194,
  "content": "pay_invoice pay_keysend get_balance get_info make_invoice lookup_invoice list_transactions multi_pay_invoice multi_pay_keysend sign_message notifications",
  "tags": [
    ["notifications", "payment_received payment_sent"]
  ]
}
```

### 2. **Request Event (kind 23194)**

Client sends payment request:

```json
{
  "kind": 23194,
  "content": "encrypted_payload",
  "tags": [
    ["p", "wallet_service_pubkey"],
    ["expiration", "1713883677"]
  ]
}
```

Encrypted payload:
```json
{
  "method": "pay_invoice",
  "params": {
    "invoice": "lnbc50n1...",
    "amount": 123
  }
}
```

### 3. **Response Event (kind 23195)**

Wallet service responds:

```json
{
  "kind": 23195,
  "content": "encrypted_response",
  "tags": [
    ["p", "client_pubkey"],
    ["e", "request_event_id"]
  ]
}
```

Encrypted response:
```json
{
  "result_type": "pay_invoice",
  "result": {
    "preimage": "0123456789abcdef...",
    "fees_paid": 123
  }
}
```

## Security Considerations

### 1. **Encryption**

- All NIP-47 messages are encrypted using NIP-04
- Each connection uses unique keys for privacy
- No user identity is linked to payment activity

### 2. **Authentication**

- NWC credentials are stored locally only
- No server-side storage of sensitive data
- Connection strings contain unique secrets per client

### 3. **Relay Security**

- Use dedicated relays for better reliability
- Implement relay fallback for redundancy
- Monitor relay performance and switch if needed

## Error Handling

### Common Error Codes

- `PAYMENT_FAILED`: Payment routing failed
- `INSUFFICIENT_BALANCE`: Wallet has insufficient funds
- `UNAUTHORIZED`: Invalid credentials
- `RATE_LIMITED`: Too many requests
- `NOT_IMPLEMENTED`: Method not supported

### Recovery Strategies

```typescript
// Automatic retry with exponential backoff
const retryWithBackoff = async (operation: () => Promise<any>, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
```

## Best Practices

### 1. **Invoice Validation**

```typescript
// Validate Taproot asset invoices
const validateTaprootAssetInvoice = (invoice: string): InvoiceInfo => {
  const validation = albyAuth.validateInvoice(invoice);
  
  if (!validation.valid) {
    return validation;
  }

  // Additional Taproot asset specific validation
  // Check for asset routing hints, etc.
  
  return validation;
};
```

### 2. **Balance Checking**

```typescript
// Always check balance before payment
const checkBalanceBeforePayment = async (requiredAmount: number) => {
  const balance = await albyAuth.getBalance();
  const balanceSats = Math.floor(balance / 1000);
  
  if (balanceSats < requiredAmount) {
    throw new Error(`Insufficient balance: ${balanceSats} sats, need ${requiredAmount} sats`);
  }
};
```

### 3. **Connection Monitoring**

```typescript
// Monitor connection state
albyAuth.onConnectionStateChange((state) => {
  if (state === 'disconnected') {
    // Attempt reconnection
    albyAuth.reconnectWallet();
  }
});
```

## Example Usage

### Complete Purchase Flow

```typescript
import { albyAuth } from '../services/albyAuth';
import { TaprootAssetPayment } from '../components/TaprootAssetPayment';

function AssetPurchasePage() {
  const handlePurchase = async (assetId: string, amount: string, price: number) => {
    try {
      // 1. Check if user is authenticated
      if (!albyAuth.isAuthenticated()) {
        throw new Error('Please connect your wallet first');
      }

      // 2. Check balance
      const balance = await albyAuth.getBalance();
      const requiredAmount = (price + 1) * 1000; // Add network fee
      
      if (balance < requiredAmount) {
        throw new Error('Insufficient balance');
      }

      // 3. Process payment
      const result = await albyAuth.makeTaprootAssetPayment(
        assetId,
        amount,
        'seller_peer_pubkey'
      );

      console.log('Purchase successful:', result);
      
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  return (
    <TaprootAssetPayment
      assetId="asset_id_here"
      assetName="Gaming Credits"
      assetAmount="1000"
      price={250}
      onSuccess={handlePurchase}
    />
  );
}
```

## Troubleshooting

### Common Issues

1. **Connection Failures**
   - Check NWC credentials
   - Verify relay connectivity
   - Ensure wallet service is running

2. **Payment Failures**
   - Verify sufficient balance
   - Check invoice validity
   - Ensure proper routing

3. **Asset Transfer Issues**
   - Verify Taproot assets node is running
   - Check asset availability
   - Ensure proper channel capacity

### Debug Information

Enable debug logging:

```typescript
// Enable detailed logging
const DEBUG = true;

if (DEBUG) {
  console.log('NIP-47 Request:', request);
  console.log('Taproot Asset Response:', response);
  console.log('Payment Result:', result);
}
```

## Future Enhancements

1. **Multi-Asset Payments**: Support for purchasing multiple assets in one transaction
2. **Escrow Services**: Secure escrow for high-value assets
3. **Payment Splitting**: Split payments across multiple sellers
4. **Advanced Routing**: Optimize Lightning routing for Taproot assets
5. **Analytics**: Detailed transaction analytics and reporting

## Resources

- [NIP-47 Specification](https://github.com/nostr-protocol/nips/blob/master/47.md)
- [Alby Documentation](https://docs.getalby.com/)
- [Taproot Assets Documentation](https://docs.lightning.engineering/lightning-network-tools/taproot-assets)
- [Lightning Network BOLT11](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md) 