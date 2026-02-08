
import pg from 'pg';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

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
    console.log('Starting Import: ExpenseEntry from Excel...');
    const client = await pool.connect();

    try {
        // Read Excel
        const filePath = path.join(__dirname, '../ExpenseEntry.xlsx');
        console.log(`Reading file: ${filePath}`);
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const entries = XLSX.utils.sheet_to_json(sheet, { cellDates: true });

        console.log(`Found ${entries.length} entries.`);

        await client.query('BEGIN');

        let insertedCount = 0;

        for (const entry of entries) {
            // Generate ID
            const id = `exp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

            // Handle Date
            let dateVal = entry.date;
            if (dateVal instanceof Date) {
               // Keep as Date object, pg handles it, or toISOString
               dateVal = dateVal.toISOString(); // Safer
            } else if (typeof dateVal === 'number') {
                 // Fallback if cellDates didn't catch it
                 const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                 dateVal = d.toISOString();
            } else if (typeof dateVal === 'string') {
                // assume 'YYYY-MM-DD'
                dateVal = new Date(dateVal).toISOString();
            }

            // Handle Department
            // Since all are shared, default to Management to satisfy NOT NULL
            const departmentId = entry.departmentId || 'Dept-Management';

            // Handle isShared
            const isShared = entry.isShared === true || entry.isShared === 'true';

            await client.query(
                `INSERT INTO "ExpenseEntry" (
                    "id", "date", "journalNo", "categoryId", "departmentId", "employeeId",
                    "amount", "amountPaid", "remainingAmount", "description", "isShared"
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [
                    id,
                    dateVal,
                    entry.journalNo,
                    entry.categoryId,
                    departmentId,
                    entry.employeeId || null,
                    entry.amount,
                    entry.amountPaid,
                    entry.remainingAmount,
                    entry.description,
                    isShared
                ]
            );

            insertedCount++;
        }

        await client.query('COMMIT');
        console.log(`Import successful.`);
        console.log(`Inserted ${insertedCount} records.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Import failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
