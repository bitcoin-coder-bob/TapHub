import { NextRequest, NextResponse } from 'next/server';

interface GoApiAsset {
  asset_id: string;
  name: string;
  amount: string;
  asset_type: string;
  meta_hash: string;
  version: string;
  genesis_point?: string;
}

interface GoApiResponse {
  success: boolean;
  node_pubkey: string;
  node_alias: string;
  assets: GoApiAsset[];
  count: number;
  error: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get the Go API host from environment variables, default to localhost:8082
    const goApiHost = process.env.GO_API_HOST || 'localhost:8082';
    
    // Get node pubkey from query parameters or use default
    const { searchParams } = new URL(request.url);
    const nodePubkey = searchParams.get('nodePubkey') || 
                      process.env.DEFAULT_NODE_PUBKEY || 
                      '03a1b2c3d4e5f6789abcdef0123456789abcdef0123456789abcdef0123456789ab';

    // Call our Go API's getNodeAssets endpoint
    const response = await fetch(`http://${goApiHost}/getNodeAssets?nodePubkey=${nodePubkey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Go API responded with status: ${response.status}`);
    }

    const data: GoApiResponse = await response.json();
    
    if (!data.success) {
      throw new Error(`Go API error: ${data.error}`);
    }
    
    // Transform the response to match our frontend needs
    const assets = data.assets.map((asset: GoApiAsset) => ({
      id: asset.asset_id,
      name: asset.name || 'Unnamed Asset',
      symbol: asset.meta_hash ? 'META' : 'TOKEN',
      totalSupply: asset.amount,
      available: asset.amount, // Assuming all supply is available initially
      status: 'Available',
      assetType: asset.asset_type,
      version: asset.version,
      genesisPoint: asset.genesis_point
    }));

    return NextResponse.json({ 
      assets,
      nodePubkey: data.node_pubkey,
      nodeAlias: data.node_alias,
      totalCount: data.count
    });
  } catch (error) {
    console.error('Error fetching available assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available assets' },
      { status: 500 }
    );
  }
} 