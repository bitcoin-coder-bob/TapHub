import { NextRequest, NextResponse } from "next/server";
import mongo from "mongodb";

export async function POST(request: NextRequest) {
  const client = new mongo.MongoClient(process.env.MONGODB_URI!);
  await client.connect();

  const db = client.db("nodes");
  const collection = db.collection("nodes");

  const body = await request.json();

  const result = await collection.insertOne(body);

  return NextResponse.json(result);
}   