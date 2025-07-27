import { NextRequest, NextResponse } from "next/server";
import mongo from "mongodb";

export async function POST(request: NextRequest) {
  let client: mongo.MongoClient | null = null;
  
  try {
    const body = await request.json();
    
    client = new mongo.MongoClient(process.env.MONGODB_URI!);
    await client.connect();

    const db = client.db("nodes");
    const collection = db.collection("nodes");

    const result = await collection.insertOne(body);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error saving verified node:", error);
    return NextResponse.json(
      { error: "Failed to save verified node" },
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