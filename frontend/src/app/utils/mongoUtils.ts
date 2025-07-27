import mongo from "mongodb";

export interface MongoOperation<T> {
  (db: mongo.Db): Promise<T>;
}

export async function withMongoConnection<T>(
  operation: MongoOperation<T>,
  dbName: string = "nodes"
): Promise<T> {
  let client: mongo.MongoClient | null = null;
  
  try {
    client = new mongo.MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    
    const db = client.db(dbName);
    return await operation(db);
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