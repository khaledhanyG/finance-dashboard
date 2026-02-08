import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function listTasks() {
    console.log('Listing tasks from database (small-river)...');
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, notes, status, "createdAt" FROM "Task" ORDER BY "createdAt" DESC');
        console.log(`Found ${res.rowCount} tasks:`);
        res.rows.forEach(r => {
            console.log(`- [${r.status}] ${r.notes} (ID: ${r.id})`);
        });

        if (res.rowCount > 0) {
            console.log('\nCONCLUSION: Data IS present in this server/database.');
        } else {
            console.log('\nCONCLUSION: Database is truly empty.');
        }

    } catch (err) {
        console.error('List test failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

listTasks();
