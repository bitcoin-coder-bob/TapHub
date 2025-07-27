import { NextResponse } from 'next/server';

interface TaprootAsset {
  asset_genesis: {
    asset_id: string;
    name?: string;
    meta_hash?: string;
    amount: string;
  };
}

interface TaprootAssetsResponse {
  assets?: TaprootAsset[];
}

export async function GET() {
  try {
    const taprootAssetsHost = process.env.TAPROOT_ASSETS_HOST;
    const taprootAssetsMacaroon = process.env.TAPROOT_ASSETS_MACAROON;

    if (!taprootAssetsHost || !taprootAssetsMacaroon) {
      return NextResponse.json(
        { error: 'Taproot Assets configuration not found' },
        { status: 500 }
      );
    }

    // Fetch assets from taproot-assets node
    const response = await fetch(`http://${taprootAssetsHost}/v1/taproot-assets/assets`, {
      headers: {
        'Grpc-Metadata-macaroon': taprootAssetsMacaroon,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Taproot Assets API responded with status: ${response.status}`);
    }

    const data: TaprootAssetsResponse = await response.json();
    
    // Transform the response to match our frontend needs
    const assets = data.assets?.map((asset: TaprootAsset) => ({
      id: asset.asset_genesis.asset_id,
      name: asset.asset_genesis.name || 'Unnamed Asset',
      symbol: asset.asset_genesis.meta_hash ? 'META' : 'TOKEN',
      totalSupply: asset.asset_genesis.amount,
      available: asset.asset_genesis.amount, // Assuming all supply is available initially
      status: 'Available'
    })) || [];

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error fetching available assets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch available assets' },
      { status: 500 }
    );
  }
} 