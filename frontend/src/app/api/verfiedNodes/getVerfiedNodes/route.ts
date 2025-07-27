import { NextResponse } from "next/server";
import mongo from "mongodb";

export async function GET() {
  let client: mongo.MongoClient | null = null;
  
  try {
    client = new mongo.MongoClient(process.env.MONGODB_URI!);
    await client.connect();

    const db = client.db("nodes");
    const collection = db.collection("nodes");

    const nodes = await collection.find({}, { projection: { pubkey: 1, _id: 0 } }).toArray();
    
    // Extract just the pubkeys
    const pubkeys = nodes.map(node => node.pubkey);

    return NextResponse.json(pubkeys);
  } catch (error) {
    console.error("Error fetching verified nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch verified nodes" },
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