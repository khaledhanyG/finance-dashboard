import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
});

async function testRead() {
    console.log('Attempting to read from database...');
    const client = await pool.connect();
    try {
        // Check tables existence
        const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log('Tables found:', tablesRes.rows.map(r => r.table_name).join(', '));

        if (tablesRes.rows.length === 0) {
            console.warn('WARNING: No tables found in public schema! The database might be empty or uninitialized.');
        } else {
            // Try reading from a key table, e.g. ExpenseEntry
            try {
                const expenseRes = await client.query('SELECT count(*) FROM "ExpenseEntry"');
                console.log(`ExpenseEntry count: ${expenseRes.rows[0].count}`);
            } catch (e) {
                console.error('Could not read "ExpenseEntry". Table might be missing or empty.', e.message);
            }
        }

        // Try reading state-like data similar to api/state.ts
        try {
            const deptRes = await client.query('SELECT * FROM "Department" LIMIT 5');
            console.log(`Departments found: ${deptRes.rowCount}`);
        } catch (e) {
            console.log('Could not read Department table.');
        }

        client.release();
        await pool.end();
    } catch (err) {
        console.error('Read test failed:', err);
        await pool.end();
    }
}

testRead();
