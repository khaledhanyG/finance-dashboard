
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
        const res = await client.query(`
            SELECT * FROM "IncomeEntry" 
            WHERE type = 'refund' AND amount = 0
        `);
        console.log(`Found ${res.rowCount} refund entries with 0 amount.`);
        if (res.rowCount > 0) {
            console.log('Sample:', res.rows[0]);
        }
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
