import mongo from "mongodb";

// Singleton MongoDB client instance with connection pooling
class MongoConnectionManager {
  private static instance: MongoConnectionManager;
  private client: mongo.MongoClient | null = null;
  private isConnecting: boolean = false;

  private constructor() {}

  public static getInstance(): MongoConnectionManager {
    if (!MongoConnectionManager.instance) {
      MongoConnectionManager.instance = new MongoConnectionManager();
    }
    return MongoConnectionManager.instance;
  }

  public async getClient(): Promise<mongo.MongoClient> {
    if (this.client) {
      return this.client;
    }

    if (this.isConnecting) {
      // Wait for the connection to be established
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.client!;
    }

    this.isConnecting = true;
    
    try {
      // Configure connection pool settings
      const options: mongo.MongoClientOptions = {
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2,  // Minimum number of connections in the pool
        maxConnecting: 3, // Maximum number of connections being established concurrently
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        connectTimeoutMS: 10000, // 10 second connection timeout
        socketTimeoutMS: 45000, // 45 second socket timeout
        waitQueueTimeoutMS: 5000, // 5 second wait timeout for connections
        retryWrites: true,
        retryReads: true,
      };

      console.log('Attempting MongoDB connection to:', process.env.MONGODB_URI?.replace(/:[^:]*@/, ':****@'));
      
      this.client = new mongo.MongoClient(process.env.MONGODB_URI!, options);
      await this.client.connect();
      
      console.log('MongoDB connection pool established');
      return this.client;
    } catch (error) {
      console.error('Failed to establish MongoDB connection:', error);
      this.client = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  public async getDb(dbName: string = "nodes"): Promise<mongo.Db> {
    const client = await this.getClient();
    return client.db(dbName);
  }

  public async close(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('MongoDB connection pool closed');
      } catch (error) {
        console.error('Error closing MongoDB connection:', error);
      } finally {
        this.client = null;
      }
    }
  }
}

// Export the singleton instance
export const mongoManager = MongoConnectionManager.getInstance();

// Utility function for database operations with automatic connection management
export interface MongoOperation<T> {
  (db: mongo.Db): Promise<T>;
}

export async function withMongoConnection<T>(
  operation: MongoOperation<T>,
  dbName: string = "nodes"
): Promise<T> {
  try {
    const db = await mongoManager.getDb(dbName);
    return await operation(db);
  } catch (error) {
    console.error('MongoDB operation failed:', error);
    throw error;
  }
}

// Graceful shutdown handler
export async function closeMongoConnection(): Promise<void> {
  await mongoManager.close();
} 