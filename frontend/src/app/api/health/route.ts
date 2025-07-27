import { NextResponse } from "next/server";
import { withMongoConnection } from "../../utils/mongoUtils";

export async function GET() {
  try {
    // Test the MongoDB connection
    const result = await withMongoConnection(async (db) => {
      // Simple ping to test connection
      await db.admin().ping();
      
      // Get some basic stats
      const stats = await db.stats();
      
      return {
        status: "healthy",
        database: db.databaseName,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        timestamp: new Date().toISOString()
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      { 
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 