
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
        const res = await client.query('SELECT * FROM "IncomeService" LIMIT 5');
        console.log(JSON.stringify(res.rows, null, 2));
    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
