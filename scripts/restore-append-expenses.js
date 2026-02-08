
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
    console.log('Restoring Data: Appending records from ExpenseEntry_old.xlsx...');
    const client = await pool.connect();

    try {
        const filePath = path.join(__dirname, '../ExpenseEntry_old.xlsx');
        console.log(`Reading file: ${filePath}`);
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const entries = XLSX.utils.sheet_to_json(sheet, { cellDates: true });

        console.log(`Found ${entries.length} entries in backup file.`);

        await client.query('BEGIN');

        let insertedCount = 0;
        let skippedCount = 0;

        for (const entry of entries) {
            // Validate required fields
            if (!entry.date || !entry.amount || !entry.journalNo) {
                console.warn('Skipping invalid row:', JSON.stringify(entry));
                skippedCount++;
                continue;
            }

            // Check for duplicates by JournalNo (assuming distinct)
            // If journalNo can be duplicate, we might need other checks.
            // For safety, let's assume if journalNo exists, we skip to avoid double counting.
            
            const check = await client.query('SELECT 1 FROM "ExpenseEntry" WHERE "journalNo" = $1', [String(entry.journalNo)]);
            if (check.rowCount > 0) {
                // console.log(`Skipping duplicate JournalNo: ${entry.journalNo}`);
                skippedCount++;
                continue;
            }

            // Generate ID
            const id = `exp-restored-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

            // Handle Date
            let dateVal = entry.date;
            if (dateVal instanceof Date) {
               dateVal = dateVal.toISOString();
            } else if (typeof dateVal === 'number') {
                 const d = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                 dateVal = d.toISOString();
            } else if (typeof dateVal === 'string') {
                dateVal = new Date(dateVal).toISOString();
            }

            // Handle Department (Default to Management if missing/shared)
            const departmentId = entry.departmentId || 'Dept-Management';
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
        console.log(`Restore successful.`);
        console.log(`Inserted ${insertedCount} records.`);
        console.log(`Skipped ${skippedCount} duplicates.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Restore failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
