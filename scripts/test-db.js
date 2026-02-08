import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

console.log('Testing database connection...');
console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL not found in environment variables.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to the database!');

        // Optional: Run a simple query
        const res = await client.query('SELECT NOW()');
        console.log('Current Database Server Time:', res.rows[0].now);

        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err);
        await pool.end();
        process.exit(1);
    }
}

testConnection();
