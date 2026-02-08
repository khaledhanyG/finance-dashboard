
import { createRequire } from 'module';
import * as fs from 'fs';
const require = createRequire(import.meta.url);
const csv = require('csv-parser');

async function main() {
    let nonZeroCount = 0;
    let totalCancelled = 0;

    fs.createReadStream('cr.csv')
        .pipe(csv())
        .on('data', (row) => {
            const val = Number(row.totalInspectorShareCancelled);
            if (val && val !== 0) {
                nonZeroCount++;
                totalCancelled += val;
            }
        })
        .on('end', () => {
            console.log(`Found ${nonZeroCount} rows with non-zero Inspector Share.`);
            console.log(`Total Inspector Share Cancelled in CSV: ${totalCancelled}`);
        });
}
main();
