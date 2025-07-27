import { NextResponse } from "next/server";
import mongo from "mongodb";

export async function GET() {
  const client = new mongo.MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db("nodes");
  const collection = db.collection("nodes");

  const nodes = await collection.find({}, { projection: { pubkey: 1, _id: 0 } }).toArray();
  
  // Extract just the pubkeys
  const pubkeys = nodes.map(node => node.pubkey);

  await client.close();

  return NextResponse.json(pubkeys);
}