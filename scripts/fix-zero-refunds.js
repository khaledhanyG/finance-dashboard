
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

        // Find entries where amount is 0/null but totalRefundsAmount has a value
        const res = await client.query(`
            SELECT id, "totalRefundsAmount" 
            FROM "IncomeEntry" 
            WHERE type = 'refund' AND (amount = 0 OR amount IS NULL) AND "totalRefundsAmount" > 0
        `);

        console.log(`Found ${res.rowCount} entries to fix.`);

        for (const row of res.rows) {
            const correctAmount = -1 * Math.abs(Number(row.totalRefundsAmount));
            console.log(`Fixing ID ${row.id}: Setting amount to ${correctAmount}`);

            await client.query(`
                UPDATE "IncomeEntry" 
                SET amount = $1 
                WHERE id = $2
            `, [correctAmount, row.id]);
        }

        await client.query('COMMIT');
        console.log('Fix applied successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
