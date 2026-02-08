
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
        const total = await client.query('SELECT COUNT(*) FROM "ExpenseEntry"');
        console.log(`Total DB Records: ${total.rows[0].count}`);

        const sample = await client.query('SELECT "journalNo", "amount", "description" FROM "ExpenseEntry" LIMIT 5');
        console.log('Sample Records:');
        console.table(sample.rows);

        const check = await client.query('SELECT * FROM "ExpenseEntry" WHERE "journalNo" = $1 OR "journalNo" = $2', ['28279', '26870']);
        console.log(`Check specific journals (28279, 26870): Found ${check.rowCount}`);
        if (check.rowCount > 0) console.table(check.rows);

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
