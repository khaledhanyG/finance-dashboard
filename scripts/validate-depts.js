
import { createRequire } from 'module';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const workbook = XLSX.readFile('Employee.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Collect all Department IDs from Excel
    const excelDeptIds = new Set(rows.map(r => r.departmentId).filter(Boolean));

    console.log(`Excel contains ${excelDeptIds.size} unique Department IDs.`);

    const client = await pool.connect();
    try {
        const res = await client.query('SELECT id, name FROM "Department"');
        const dbDeptIds = new Set(res.rows.map(d => d.id));

        console.log(`Database contains ${dbDeptIds.size} Departments.`);

        const missing = [...excelDeptIds].filter(id => !dbDeptIds.has(id));

        if (missing.length > 0) {
            console.warn('WARNING: The following Department IDs in Excel do NOT exist in DB:');
            console.log(missing);
        } else {
            console.log('All Department IDs in Excel exist in the Database. Safe to import.');
        }

    } finally {
        client.release();
        pool.end();
    }
}
main().catch(console.error);
