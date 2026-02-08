
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile('Invoices.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet); // Objects

// Group by Date + Service
const grouped = {};
let duplicates = 0;

data.forEach(row => {
    // Excel date is scalar (days since 1900). Convert to YYYY-MM-DD
    const dateObj = new Date(Math.round((row.date - 25569) * 864e5));
    const dateStr = dateObj.toISOString().split('T')[0];
    const key = `${dateStr}_${row.serviceId}`;

    if (grouped[key]) {
        duplicates++;
        grouped[key].count++;
        grouped[key].amount += (row.amount || 0);
    } else {
        grouped[key] = {
            date: dateStr,
            serviceId: row.serviceId,
            count: 1,
            amount: (row.amount || 0),
            rows: []
        };
    }
    grouped[key].rows.push(row);
});

console.log('Total Rows:', data.length);
console.log('Unique Date+Service Groups:', Object.keys(grouped).length);
console.log('Duplicate Rows (Collision on Date+Service):', duplicates);

// Sample group with > 1 row
const sampleKey = Object.keys(grouped).find(k => grouped[k].count > 1);
if (sampleKey) {
    console.log('Sample Group with multiple rows:', JSON.stringify(grouped[sampleKey], null, 2));
} else {
    console.log('No groups with multiple rows found. Data is already unique per day/service.');
}
