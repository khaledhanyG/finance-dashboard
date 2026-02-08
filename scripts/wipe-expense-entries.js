
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('WARNING: This will delete ALL records from the ExpenseEntry table.');
    console.log('Starting delete operation...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check current count
        const countBefore = await client.query('SELECT COUNT(*) FROM "ExpenseEntry"');
        console.log(`Current records: ${countBefore.rows[0].count}`);

        // DELETE
        const res = await client.query('DELETE FROM "ExpenseEntry"');
        console.log(`Deleted ${res.rowCount} records.`);

        await client.query('COMMIT');
        console.log('Operation successful.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Operation failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
