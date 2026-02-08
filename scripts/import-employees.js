
import { createRequire } from 'module';
import pg from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Reading Employee.xlsx...');
    const workbook = XLSX.readFile('Employee.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} employees to import.`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let processed = 0;
        for (const emp of rows) {
            // Validate required fields
            if (!emp.name) {
                console.warn('Skipping employee without name:', emp);
                continue;
            }

            // ID: Use Excel ID if present, else generate
            const id = emp.id || `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // isActive: Convert string "true"/"false" or boolean to boolean
            let isActive = true;
            if (typeof emp.isActive === 'string') {
                isActive = emp.isActive.toLowerCase() === 'true';
            } else if (typeof emp.isActive === 'boolean') {
                isActive = emp.isActive;
            }

            // Check if exists
            const existing = await client.query('SELECT 1 FROM "Employee" WHERE id = $1', [id]);

            if (existing.rowCount > 0) {
                // Update
                await client.query(`
                    UPDATE "Employee" SET
                    "name" = $2,
                    "employeeNumber" = $3,
                    "departmentId" = $4,
                    "salary" = $5,
                    "nationality" = $6,
                    "isActive" = $7
                    WHERE "id" = $1
                `, [
                    id,
                    emp.name,
                    emp.employeeNumber || '',
                    emp.departmentId || null,
                    Number(emp.salary) || 0,
                    emp.nationality || '',
                    isActive
                ]);
            } else {
                // Insert
                await client.query(`
                    INSERT INTO "Employee" 
                    ("id", "name", "employeeNumber", "departmentId", "salary", "nationality", "isActive")
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    id,
                    emp.name,
                    emp.employeeNumber || '',
                    emp.departmentId || null,
                    Number(emp.salary) || 0,
                    emp.nationality || '',
                    isActive
                ]);
            }

            processed++;
        }

        await client.query('COMMIT');
        console.log(`Successfully imported/updated ${processed} employees.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error importing employees:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
