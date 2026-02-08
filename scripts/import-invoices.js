
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

const INSPECTOR_SHARE_CAT_ID = 'cat-1766658698744';
const PAYMENT_GATEWAY_CAT_ID = 'cat-1766658720313';

async function main() {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('Invoices.xlsx');
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rawData.length} rows. Aggregating...`);

    const aggregated = {};

    rawData.forEach(row => {
        // Excel date to YYYY-MM-DD
        let dateStr;
        if (typeof row.date === 'number') {
            const dateObj = new Date(Math.round((row.date - 25569) * 864e5));
            dateStr = dateObj.toISOString().split('T')[0];
        } else {
            // Assume string YYYY-MM-DD
            dateStr = row.date;
        }

        if (!dateStr || !row.serviceId) {
            // console.warn('Skipping invalid row:', row);
            return;
        }

        const key = `${dateStr}_${row.serviceId}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                date: dateStr,
                serviceId: row.serviceId,
                amount: 0,
                count: 0,
                cogsInspector: 0,
                cogsGateway: 0,
                refundsAmt: 0,
                inspCancelled: 0
            };
        }

        const group = aggregated[key];
        group.amount += (Number(row.amount) || 0);
        group.count += 1;
        group.cogsInspector += (Number(row['COGS> Inspector share']) || 0);
        group.cogsGateway += (Number(row['COGS Payment Gateway']) || 0);
        group.refundsAmt += (Number(row.totalRefundsAmount) || 0);
        group.inspCancelled += (Number(row.totalInspectorShareCancelled) || 0);
    });

    const groups = Object.values(aggregated);
    console.log(`Aggregated into ${groups.length} unique entries.`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let processed = 0;
        for (const entry of groups) {
            // 1. Check if entry exists for this Day + Service
            const existingRes = await client.query(
                `SELECT id FROM "IncomeEntry" WHERE "date" = $1 AND "serviceId" = $2`,
                [entry.date, entry.serviceId]
            );

            let incomeId;

            if (existingRes.rowCount > 0) {
                incomeId = existingRes.rows[0].id;
                // Delete children first
                await client.query('DELETE FROM "IncomeCogsItem" WHERE "incomeEntryId" = $1', [incomeId]);
                await client.query('DELETE FROM "IncomeRefundItem" WHERE "incomeEntryId" = $1', [incomeId]);

                // Update parent
                await client.query(`
                    UPDATE "IncomeEntry" SET
                    "amount" = $1,
                    "ordersCount" = $2,
                    "grossOrdersCount" = $3,
                    "cogs" = $4,
                    "totalRefundsAmount" = $5,
                    "totalInspectorShareCancelled" = $6,
                    "description" = $7
                    WHERE "id" = $8
                `, [
                    entry.amount,
                    entry.count.toString(),
                    entry.count.toString(),
                    (entry.cogsInspector + entry.cogsGateway),
                    entry.refundsAmt,
                    entry.inspCancelled,
                    'Imported from Excel',
                    incomeId
                ]);
            } else {
                incomeId = randomUUID();
                await client.query(`
                    INSERT INTO "IncomeEntry" 
                    ("id", "date", "serviceId", "departmentId", "type", "amount", "ordersCount", "grossOrdersCount", "cogs", "totalRefundsAmount", "totalInspectorShareCancelled", "description")
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                `, [
                    incomeId,
                    entry.date,
                    entry.serviceId,
                    null, // departmentId
                    'revenue',
                    entry.amount,
                    entry.count.toString(), // ordersCount
                    entry.count.toString(), // grossOrdersCount
                    (entry.cogsInspector + entry.cogsGateway),
                    entry.refundsAmt,
                    entry.inspCancelled,
                    'Imported from Excel'
                ]);
            }

            // Insert COGS Items
            if (entry.cogsInspector !== 0) {
                await client.query(
                    'INSERT INTO "IncomeCogsItem" ("id", "incomeEntryId", "categoryId", "amount") VALUES ($1, $2, $3, $4)',
                    [randomUUID(), incomeId, INSPECTOR_SHARE_CAT_ID, entry.cogsInspector]
                );
            }
            if (entry.cogsGateway !== 0) {
                await client.query(
                    'INSERT INTO "IncomeCogsItem" ("id", "incomeEntryId", "categoryId", "amount") VALUES ($1, $2, $3, $4)',
                    [randomUUID(), incomeId, PAYMENT_GATEWAY_CAT_ID, entry.cogsGateway]
                );
            }

            processed++;
            // Commit every 50 records to save progress and avoid timeouts
            if (processed % 50 === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');
                console.log(`Processed ${processed}/${groups.length} (Saved)`);
            }
        }

        await client.query('COMMIT');
        console.log('Successfully imported all entries.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error importing:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
