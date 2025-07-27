export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");

  if (!assetId) {
    return new Response("Asset ID is required", { status: 400 });
  }

  // Return a message indicating this endpoint should use POST for invoice generation
  return new Response(JSON.stringify({ 
    message: "Use POST method to generate taproot asset invoices",
    requiredFields: ["assetId", "assetAmount"],
    optionalFields: ["peerPubkey", "invoiceRequest", "hodlInvoice", "groupKey"]
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });   
}       