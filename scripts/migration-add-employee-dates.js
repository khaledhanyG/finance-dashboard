
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Starting migration: Add startDate and endDate to Employee table...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Add startDate column if it doesn't exist
        await client.query(`
            ALTER TABLE "Employee" 
            ADD COLUMN IF NOT EXISTS "startDate" DATE,
            ADD COLUMN IF NOT EXISTS "endDate" DATE;
        `);

        await client.query('COMMIT');
        console.log('Migration successful: Columns added.');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
