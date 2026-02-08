
import pg from 'pg';
import dotenv from 'dotenv';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        // Fetch valid categories
        const catRes = await client.query('SELECT id FROM "ExpenseCategory"');
        const validCatIds = new Set(catRes.rows.map(r => r.id));

        // Read Excel
        const filePath = path.join(__dirname, '../ExpenseEntry.xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        let sharedCount = 0;
        let falseSharedCount = 0;
        const invalidCats = new Set();

        data.forEach(row => {
            if (row.isShared) sharedCount++;
            else falseSharedCount++;
            
            if (row.categoryId && !validCatIds.has(row.categoryId)) {
                invalidCats.add(row.categoryId);
            }
        });

        console.log(`Total Rows: ${data.length}`);
        console.log(`True isShared: ${sharedCount}`);
        console.log(`False/Missing isShared: ${falseSharedCount}`);
        
        if (invalidCats.size > 0) {
            console.warn('WARNING: Found invalid categoryIds not in DB:', Array.from(invalidCats));
        } else {
            console.log('All categoryIds are valid.');
        }

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
