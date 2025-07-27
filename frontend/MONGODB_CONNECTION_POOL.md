# MongoDB Connection Pool Implementation

## Overview

This document describes the MongoDB connection pool implementation used in the TapHub frontend application to prevent ECONNRESET errors and improve performance.

## Architecture

### Connection Pool Manager (`mongoUtils.ts`)

The application uses a singleton pattern with the `MongoConnectionManager` class to manage MongoDB connections:

- **Singleton Pattern**: Only one MongoDB client instance is created per application
- **Connection Pooling**: Configures optimal connection pool settings
- **Automatic Cleanup**: Connections are automatically returned to the pool
- **Error Handling**: Comprehensive error handling and logging

### Connection Pool Configuration

```typescript
const options: mongo.MongoClientOptions = {
  maxPoolSize: 10,        // Maximum connections in pool
  minPoolSize: 2,         // Minimum connections in pool
  maxConnecting: 3,       // Max concurrent connections being established
  maxIdleTimeMS: 30000,   // Close idle connections after 30 seconds
  connectTimeoutMS: 10000, // 10 second connection timeout
  socketTimeoutMS: 45000,  // 45 second socket timeout
  waitQueueTimeoutMS: 5000, // 5 second wait timeout
  retryWrites: true,      // Enable retry for write operations
  retryReads: true,       // Enable retry for read operations
};
```

## Usage

### Basic Usage with `withMongoConnection`

```typescript
import { withMongoConnection } from "../../../utils/mongoUtils";

export async function GET() {
  try {
    const result = await withMongoConnection(async (db) => {
      const collection = db.collection("nodes");
      return await collection.find({}).toArray();
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
```

### Direct Database Access

```typescript
import { mongoManager } from "../../../utils/mongoUtils";

export async function POST() {
  try {
    const db = await mongoManager.getDb("nodes");
    const collection = db.collection("nodes");
    // ... perform operations
  } catch (error) {
    // ... handle error
  }
}
```

## Benefits

1. **Prevents ECONNRESET Errors**: Proper connection management reduces connection failures
2. **Improved Performance**: Connection reuse reduces latency
3. **Resource Efficiency**: Optimal connection pool sizing
4. **Automatic Cleanup**: No manual connection management required
5. **Error Resilience**: Built-in retry mechanisms and error handling

## Health Check

A health check endpoint is available at `/api/health` to monitor MongoDB connectivity:

```bash
curl http://localhost:3000/api/health
```

Response:
```json
{
  "status": "healthy",
  "database": "nodes",
  "collections": 2,
  "dataSize": 1024,
  "storageSize": 2048,
  "indexes": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **ECONNRESET Errors**: Usually resolved by the connection pool implementation
2. **Connection Timeouts**: Check network connectivity and MongoDB Atlas status
3. **Pool Exhaustion**: Monitor connection pool usage and adjust `maxPoolSize` if needed

### Debugging

1. Check the health endpoint: `/api/health`
2. Monitor application logs for MongoDB connection messages
3. Verify MongoDB Atlas cluster status
4. Check environment variables: `MONGODB_URI`

### Performance Monitoring

- Monitor connection pool usage
- Track query performance
- Watch for connection timeouts
- Monitor MongoDB Atlas metrics

## Migration from Individual Connections

All API routes have been updated to use the connection pool:

- ✅ `getVerfiedNodes/route.ts`
- ✅ `saveVerifiedNodes/route.ts`
- ✅ `getNodeAssets/route.ts`
- ✅ `saveNodeAssets/route.ts`

## Best Practices

1. Always use `withMongoConnection` for database operations
2. Handle errors appropriately in API routes
3. Monitor the health endpoint regularly
4. Keep MongoDB Atlas cluster updated
5. Use appropriate indexes for query performance 