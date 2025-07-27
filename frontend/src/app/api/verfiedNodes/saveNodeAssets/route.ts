import { NextRequest, NextResponse } from "next/server";
import mongo from "mongodb";

export default async function POST(request: NextRequest) {
  try {
    const client = new mongo.MongoClient(process.env.MONGODB_URI!);
    await client.connect();

    const db = client.db("nodes");
    const collection = db.collection("nodeAssets");

    const body = await request.json();
    
    // Validate required fields
    if (!body.nodePubkey || !body.assets) {
      return NextResponse.json(
        { error: "nodePubkey and assets are required" },
        { status: 400 }
      );
    }

    // Check if assets for this node already exist
    const existingAssets = await collection.findOne({ nodePubkey: body.nodePubkey });
    
    let result;
    if (existingAssets) {
      // Update existing assets
      result = await collection.updateOne(
        { nodePubkey: body.nodePubkey },
        { 
          $set: { 
            assets: body.assets,
            updatedAt: new Date()
          }
        }
      );
    } else {
      // Insert new assets
      result = await collection.insertOne({
        nodePubkey: body.nodePubkey,
        assets: body.assets,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await client.close();

    return NextResponse.json({
      success: true,
      result,
      message: existingAssets ? "Assets updated successfully" : "Assets saved successfully"
    });
  } catch (error) {
    console.error("Error saving node assets:", error);
    return NextResponse.json(
      { error: "Failed to save node assets" },
      { status: 500 }
    );
  }
} 