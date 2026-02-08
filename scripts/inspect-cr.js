
import { createRequire } from 'module';
import * as fs from 'fs';
const require = createRequire(import.meta.url);
const csv = require('csv-parser');

const results = [];
fs.createReadStream('cr.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', () => {
        console.log('Headers:', Object.keys(results[0]));
        console.log('First Row:', results[0]);
        console.log('Total Rows:', results.length);
    });
