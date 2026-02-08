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

async function testTaskCreate() {
    console.log('Attempting to create TASK in database (simulating api/crud)...');
    const client = await pool.connect();
    try {
        const testId = 'task-' + Date.now();
        const taskData = {
            id: testId,
            address: '123 Test St',
            notes: 'Test Note from Script',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Logic from api/crud.ts
        const tableName = 'Task';
        const columns = Object.keys(taskData).map(k => `"${k}"`).join(',');
        const values = Object.values(taskData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(',');

        // api/crud.ts uses this query structure
        const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${Object.keys(taskData).map((k, i) => `"${k}"=$${i + 1}`).join(',')}`;

        console.log('Query:', query);

        await client.query('BEGIN');
        await client.query(query, values);
        await client.query('COMMIT');

        console.log('Successfully inserted TASK. ID:', testId);

        // Verify
        const check = await client.query('SELECT * FROM "Task" WHERE id = $1', [testId]);
        if (check.rows.length > 0) {
            console.log('VERIFIED: Task exists in database.');
            console.log('Row:', check.rows[0]);
        } else {
            console.error('FAILED: Task inserted but not found.');
        }

    } catch (err) {
        console.error('Task Write test failed:', err);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        await pool.end();
    }
}

testTaskCreate();
