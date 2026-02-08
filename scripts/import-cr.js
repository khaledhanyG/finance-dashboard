
import { createRequire } from 'module';
import * as fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();
const require = createRequire(import.meta.url);
const csv = require('csv-parser');

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const results = [];

    console.log('Reading cr.csv...');

    // Wrap CSV reading in a promise
    await new Promise((resolve, reject) => {
        fs.createReadStream('cr.csv')
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject);
    });

    console.log(`Found ${results.length} rows. Aggregating...`);

    const aggregated = {};

    for (const row of results) {
        // Parse Date: "04-01-21 0:00" -> DD-MM-YY
        const datePart = row.date.split(' ')[0];
        const [day, month, year] = datePart.split('-');
        // Assuming 20xx for year
        const fullYear = '20' + year;
        const dateIso = `${fullYear}-${month}-${day}`;

        if (!dateIso || !row.serviceId) {
            console.warn('Skipping invalid row:', row);
            continue;
        }

        const key = `${dateIso}_${row.serviceId}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                date: dateIso,
                serviceId: row.serviceId,
                amount: 0,
                count: 0
            };
        }

        const group = aggregated[key];
        // Input is positive, we aggregate positive first
        let val = Number(row.amount) || 0;
        if (val === 0 && row.totalRefundsAmount) {
            val = Number(row.totalRefundsAmount) || 0;
        }

        group.amount += val;
        group.count += 1;
    }

    const groups = Object.values(aggregated);
    console.log(`Aggregated into ${groups.length} unique entries.`);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        let processed = 0;
        for (const entry of groups) {
            // Requirement: "negative numbers"
            // We create a NEW entry for this refund block

            const negAmount = -1 * Math.abs(entry.amount);
            const negCount = -1 * Math.abs(entry.count);

            await client.query(`
                INSERT INTO "IncomeEntry" 
                ("id", "date", "serviceId", "departmentId", "type", "amount", "ordersCount", "grossOrdersCount", "cogs", "totalRefundsAmount", "totalInspectorShareCancelled", "description")
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            `, [
                randomUUID(),
                entry.date,
                entry.serviceId,
                null,
                'refund', // distinct type
                negAmount,
                negCount.toString(),
                negCount.toString(), // gross count also negative? usually gross is raw, but for refund logic, net might be clearer. adhering to "negative numbers" instruction.
                0, // COGS usually 0 for refunds unless reversing COGS
                0, // totalRefundsAmount already tracked by the negative amount itself? Or is this field for tracking positive refund value?
                // In standard accounting: Revenue - Refunds = Net.
                // If we insert a negative Revenue row, we don't double count it in "totalRefundsAmount".
                // Let's keep it clean: Negative Amount handles the math.
                0,
                'Imported Refunds (CR)'
            ]);

            processed++;
        }

        await client.query('COMMIT');
        console.log(`Successfully imported ${processed} aggregate refund entries.`);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error importing:', e);
    } finally {
        client.release();
        pool.end();
    }
}

main().catch(console.error);
