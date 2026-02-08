
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function listUsers() {
  const client = await pool.connect();
  try {
    console.log("Listing users in DB...");
    const res = await client.query('SELECT id, name, email, role FROM "User"');
    console.table(res.rows);
  } catch (e) {
    console.error("Error listing users:", e);
  } finally {
    client.release();
    pool.end();
  }
}

listUsers();
