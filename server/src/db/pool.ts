import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const isTest = process.env.NODE_ENV === 'test';

// Connection pool configuration
export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: isTest ? (process.env.TEST_DB_NAME || 'eventflow_test_db') : (process.env.DB_NAME || 'eventflow_db'),
  max: 20,
  idleTimeoutMillis: 30000,
});

// Helper for standard parameterized queries
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Helper for running transactions with automatic rollback on error
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
