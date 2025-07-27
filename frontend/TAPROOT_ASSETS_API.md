# Taproot Assets Invoice Generation API

This API endpoint allows you to generate taproot asset invoices by calling the taproot-assets REST API.

## Endpoint

`POST /api/getAssets`

## Environment Variables Required

Add these to your `.env.local` file:

```env
TAPROOT_ASSETS_HOST=localhost:8089
TAPROOT_ASSETS_MACAROON=your_macaroon_hex_string_here
```

## Request Body

```json
{
  "assetId": "base64_encoded_asset_id",
  "assetAmount": "1000",
  "peerPubkey": "base64_encoded_peer_pubkey", // optional
  "invoiceRequest": {}, // optional
  "hodlInvoice": {}, // optional
  "groupKey": "base64_encoded_group_key" // optional
}
```

### Required Fields

- `assetId`: Base64 encoded asset ID (bytes)
- `assetAmount`: Asset amount as a string (uint64)

### Optional Fields

- `peerPubkey`: Base64 encoded peer public key (bytes)
- `invoiceRequest`: Invoice request object
- `hodlInvoice`: Hodl invoice object
- `groupKey`: Base64 encoded group key (bytes)

## Response

### Success Response (200)

```json
{
  "accepted_buy_quote": {
    "peer": "string",
    "id": "base64_string",
    "scid": "string",
    "asset_max_amount": "string",
    "ask_asset_rate": {
      "coefficient": "string",
      "scale": 0
    },
    "expiry": "string",
    "min_transportable_units": "string"
  },
  "invoice_result": {
    // AddInvoiceResponse object
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Asset ID is required"
}
```

#### 500 Internal Server Error
```json
{
  "error": "Taproot Assets macaroon not configured"
}
```

## Example Usage

```javascript
const response = await fetch('/api/getAssets', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    assetId: 'base64_encoded_asset_id_here',
    assetAmount: '1000'
  })
});

const result = await response.json();
console.log(result);
```

## Notes

- The API forwards the request to the taproot-assets REST API at `/v1/taproot-assets/channels/invoice`
- Make sure your taproot-assets node is running and accessible
- The macaroon should have the necessary permissions to create invoices
- All byte fields should be base64 encoded when sending to this API 