import { NextResponse } from "next/server";
import { withMongoConnection } from "../../../utils/mongoUtils";

export async function GET() {
  try {
    const pubkeys = await withMongoConnection(async (db) => {
      const collection = db.collection("nodes");
      const nodes = await collection.find({}, { projection: { pubkey: 1, _id: 0 } }).toArray();
      
      // Extract just the pubkeys
      return nodes.map(node => node.pubkey);
    });

    return NextResponse.json(pubkeys);
  } catch (error) {
    console.error("Error fetching verified nodes:", error);
    return NextResponse.json(
      { error: "Failed to fetch verified nodes" },
      { status: 500 }
    );
  }
}