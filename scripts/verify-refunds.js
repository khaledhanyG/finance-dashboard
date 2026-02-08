
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
            SELECT type, count(*), sum(amount) as total_amount 
            FROM "IncomeEntry" 
            WHERE description = 'Imported Refunds (CR)'
            GROUP BY type
        `);
        console.log('Imported Refund Stats:', res.rows);
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
