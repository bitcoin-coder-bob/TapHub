// Define types for the taproot asset invoice request
interface TaprootAssetInvoiceRequest {
  asset_id: string;
  asset_amount: string;
  peer_pubkey?: string;
  invoice_request?: Record<string, unknown>;
  hodl_invoice?: Record<string, unknown>;
  group_key?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetId, assetAmount, peerPubkey, invoiceRequest, hodlInvoice, groupKey, userPubkey } = body;

    // Check if user is authenticated (basic check)
    if (!userPubkey) {
      return new Response(JSON.stringify({ error: "User authentication required" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate required parameters
    if (!assetId) {
      return new Response(JSON.stringify({ error: "Asset ID is required" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!assetAmount) {
      return new Response(JSON.stringify({ error: "Asset amount is required" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prepare request body for taproot-assets API
    const requestBody: TaprootAssetInvoiceRequest = {
      asset_id: assetId,
      asset_amount: assetAmount.toString()
    };

    // Add optional parameters if provided
    if (peerPubkey) {
      requestBody.peer_pubkey = peerPubkey;
    }
    if (invoiceRequest) {
      requestBody.invoice_request = invoiceRequest;
    }
    if (hodlInvoice) {
      requestBody.hodl_invoice = hodlInvoice;
    }
    if (groupKey) {
      requestBody.group_key = groupKey;
    }

    // Configuration for taproot-assets REST API (Polar regtest)
    const TAPROOT_ASSETS_HOST = process.env.TAPROOT_ASSETS_HOST || '127.0.0.1:8289';
    const TAPROOT_ASSETS_MACAROON = process.env.TAPROOT_ASSETS_MACAROON;
    
    // For development/regtest, we'll create a mock invoice if macaroon isn't configured
    if (!TAPROOT_ASSETS_MACAROON) {
      console.log('No macaroon configured, returning mock invoice for development');
      
      // Generate a mock lightning invoice for testing
      const mockInvoice = {
        encoded_invoice: "lnbcrt1500n1pn9wxj0pp5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
        r_hash: "0000000000000000000000000000000000000000000000000000000000000000",
        payment_addr: "000000000000000000000000000000000000000000000000000000000000000000",
        add_index: "1",
        payment_request: `lnbcrt${assetAmount}n1pn9wxj0pp5test`,
        asset_id: assetId,
        asset_amount: assetAmount
      };
      
      return new Response(JSON.stringify(mockInvoice), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Make request to taproot-assets REST API
    const response = await fetch(`https://${TAPROOT_ASSETS_HOST}/v1/taproot-assets/channels/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Grpc-Metadata-macaroon': TAPROOT_ASSETS_MACAROON,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        error: "Failed to generate invoice",
        details: errorText,
        status: response.status
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating taproot asset invoice:', error);
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}