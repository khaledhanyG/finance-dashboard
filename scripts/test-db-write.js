import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function testWrite() {
    console.log('Attempting to write to database (small-river)...');
    const client = await pool.connect();
    try {
        const testId = 'test-' + Date.now();
        // Assuming ExpenseEntry table exists from previous read test
        const query = `
      INSERT INTO "ExpenseEntry" 
      ("id", "date", "journalNo", "categoryId", "departmentId", "employeeId", "amount", "amountPaid", "remainingAmount", "description") 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
        const values = [
            testId,
            new Date(),
            'TEST-JG',
            'cat-1',
            'dept-1',
            'emp-1',
            100,
            100,
            0,
            'Test Entry from Script'
        ];

        await client.query('BEGIN');
        const res = await client.query(query, values);
        await client.query('COMMIT');

        console.log('Successfully inserted test record via script. ID:', res.rows[0].id);

        // Verify immediately
        const check = await client.query('SELECT * FROM "ExpenseEntry" WHERE id = $1', [testId]);
        if (check.rows.length > 0) {
            console.log('VERIFIED: Record exists in database.');
        } else {
            console.error('FAILED: Record inserted but not found immediately after.');
        }

    } catch (err) {
        console.error('Write test failed:', err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

testWrite();
