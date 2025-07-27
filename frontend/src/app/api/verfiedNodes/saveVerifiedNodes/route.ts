import { NextRequest, NextResponse } from "next/server";
import { withMongoConnection } from "../../../utils/mongoUtils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await withMongoConnection(async (db) => {
      const collection = db.collection("nodes");
      return await collection.insertOne(body);
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error saving verified node:", error);
    
    let errorMessage = "Failed to save verified node";
    
    if (error.name === 'MongoServerSelectionError' && error.message?.includes('timed out')) {
      errorMessage = "MongoDB connection timed out. Please ensure: 1) Your IP is whitelisted in MongoDB Atlas Network Access, 2) The cluster is active (not paused), 3) You have internet connectivity";
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}   