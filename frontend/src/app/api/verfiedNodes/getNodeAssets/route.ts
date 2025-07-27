import { NextRequest, NextResponse } from "next/server";
import mongo from "mongodb";

export async function GET(request: NextRequest) {
  let client: mongo.MongoClient | null = null;
  
  try {
    const { searchParams } = new URL(request.url);
    const nodePubkey = searchParams.get('nodePubkey');

    if (!nodePubkey) {
      return NextResponse.json(
        { error: "nodePubkey parameter is required" },
        { status: 400 }
      );
    }

    client = new mongo.MongoClient(process.env.MONGODB_URI!);
    await client.connect();

    const db = client.db("nodes");
    const collection = db.collection("nodeAssets");

    const nodeAssets = await collection.findOne({ nodePubkey });

    if (!nodeAssets) {
      return NextResponse.json(
        { error: "No assets found for this node" },
        { status: 404 }
      );
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
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error("Error closing MongoDB connection:", closeError);
      }
    }
  }
} 