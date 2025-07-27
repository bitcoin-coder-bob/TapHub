import { NextRequest, NextResponse } from "next/server";
import { withMongoConnection } from "../../../utils/mongoUtils";
import mongo from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.nodePubkey || !body.assets) {
      return NextResponse.json(
        { error: "nodePubkey and assets are required" },
        { status: 400 }
      );
    }

    const result = await withMongoConnection(async (db) => {
      const collection = db.collection("nodeAssets");

      // Check if assets for this node already exist
      const existingAssets = await collection.findOne({ nodePubkey: body.nodePubkey });
      
      if (existingAssets) {
        // Update existing assets
        return {
          type: 'update' as const,
          result: await collection.updateOne(
            { nodePubkey: body.nodePubkey },
            { 
              $set: { 
                assets: body.assets,
                updatedAt: new Date()
              }
            }
          )
        };
      } else {
        // Insert new assets
        return {
          type: 'insert' as const,
          result: await collection.insertOne({
            nodePubkey: body.nodePubkey,
            assets: body.assets,
            createdAt: new Date(),
            updatedAt: new Date()
          })
        };
      }
    });

    return NextResponse.json({
      success: true,
      result: result.result,
      message: result.type === 'update' ? "Assets updated successfully" : "Assets saved successfully"
    });
  } catch (error) {
    console.error("Error saving node assets:", error);
    return NextResponse.json(
      { error: "Failed to save node assets" },
      { status: 500 }
    );
  }
} 