
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
        const res = await client.query('SELECT COUNT(*) FROM "IncomeEntry" WHERE description = $1', ['Imported from Excel']);
        console.log('Imported Rows Count:', res.rows[0].count);
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
