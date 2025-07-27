import clientPromise from './mongodb';
import { Db } from 'mongodb';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function getDatabase(dbName: string = 'nodes'): Promise<Db> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await clientPromise;
      return client.db(dbName);
    } catch (error) {
      lastError = error as Error;
      console.error(`MongoDB connection attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY * attempt);
      }
    }
  }
  
  throw new Error(`Failed to connect to MongoDB after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}