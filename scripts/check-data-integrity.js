
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Checking for previously imported records...');
    const client = await pool.connect();

    try {
        // These journal entries were seen in the first import (Step 322 log)
        const checkJournals = ['28279', '26870']; 
        
        const res = await client.query('SELECT "journalNo", "description", "amount" FROM "ExpenseEntry" WHERE "journalNo" = ANY($1)', [checkJournals]);
        
        console.log(`Found ${res.rowCount} matches out of ${checkJournals.length} checked.`);
        res.rows.forEach(r => console.log(`Found: ${r.journalNo} - ${r.description}`));

        const total = await client.query('SELECT COUNT(*) FROM "ExpenseEntry"');
        console.log(`Total records in DB: ${total.rows[0].count}`);

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
