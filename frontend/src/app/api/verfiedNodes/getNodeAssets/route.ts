import { NextRequest, NextResponse } from "next/server";
import { withMongoConnection } from "../../../utils/mongoUtils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodePubkey = searchParams.get('nodePubkey');

    if (!nodePubkey) {
      return NextResponse.json(
        { error: "nodePubkey parameter is required" },
        { status: 400 }
      );
    }

    const nodeAssets = await withMongoConnection(async (db) => {
      const collection = db.collection("nodeAssets");
      return await collection.findOne({ nodePubkey });
    });

    if (!nodeAssets) {
      return NextResponse.json({
        success: true,
        nodePubkey: nodePubkey,
        assets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      nodePubkey: nodeAssets.nodePubkey,
      assets: nodeAssets.assets,
      createdAt: nodeAssets.createdAt,
      updatedAt: nodeAssets.updatedAt
    });
  } catch (error) {
    console.error("Error fetching node assets:", error);
    return NextResponse.json(
      { error: "Failed to fetch node assets" },
      { status: 500 }
    );
  }
} 