
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Delete linked items first (Constraints)
        // Refunds don't usually have COGS/RefundItems in my import script, but good to be safe.
        // My import script didn't add children for refunds, but let's check.
        // Actually, looking at import-cr.js, I only inserted into IncomeEntry.

        const res = await client.query(`
            DELETE FROM "IncomeEntry" 
            WHERE description = 'Imported Refunds (CR)'
        `);

        await client.query('COMMIT');
        console.log(`Deleted ${res.rowCount} old refund entries.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
