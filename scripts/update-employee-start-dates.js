
import pg from 'pg';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    console.log('Starting migration: Update Employee start dates from Excel...');
    const client = await pool.connect();

    try {
        // Read Excel File
        const filePath = path.join(__dirname, '../Employee.xlsx');
        console.log(`Reading file: ${filePath}`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const employees = XLSX.utils.sheet_to_json(sheet, { cellDates: true }); // Parse dates as JS Date objects

        console.log(`Found ${employees.length} records in Excel.`);

        await client.query('BEGIN');

        let updatedCount = 0;
        let skippedCount = 0;

        for (const emp of employees) {
            if (!emp.id) {
                console.warn(`Skipping record without ID`);
                skippedCount++;
                continue;
            }

            // Excel date to JS Date handling
            if (emp.startDate) {
                let dateVal = emp.startDate;
                
                // If it's a Date object (thanks to cellDates: true), convert to YYYY-MM-DD
                if (dateVal instanceof Date) {
                    dateVal = dateVal.toISOString().split('T')[0];
                } 
                // If it's still a number (safe fallback if cellDates didn't work for some reason)
                else if (typeof dateVal === 'number') {
                     const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                     dateVal = d.toISOString().split('T')[0];
                }

                const res = await client.query(
                    `UPDATE "Employee" SET "startDate" = $1 WHERE "id" = $2`,
                    [dateVal, emp.id]
                );

                if (res.rowCount > 0) {
                    updatedCount++;
                } else {
                    console.log(`Employee ID ${emp.id} not found in DB.`);
                }
            } else {
                 // No start date in Excel for this row
                 skippedCount++;
            }
        }

        await client.query('COMMIT');
        console.log(`Migration successful.`);
        console.log(`Total records in Excel: ${employees.length}`);
        console.log(`Updated in DB: ${updatedCount}`);
        console.log(`Skipped (no ID or no startDate): ${skippedCount}`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
