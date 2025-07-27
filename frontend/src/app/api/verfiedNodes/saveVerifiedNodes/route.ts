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
  } catch (error) {
    console.error("Error saving verified node:", error);
    return NextResponse.json(
      { error: "Failed to save verified node" },
      { status: 500 }
    );
  }
}   