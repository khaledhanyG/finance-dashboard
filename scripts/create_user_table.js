
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  const client = await pool.connect();
  try {
    console.log("Creating User table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "role" TEXT NOT NULL
      );
    `);
    console.log("User table created successfully.");
  } catch (e) {
    console.error("Error creating table:", e);
  } finally {
    client.release();
    pool.end();
  }
}

createTable();
