
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const workbook = XLSX.readFile('Invoices.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

console.log('Headers:', JSON.stringify(data[0], null, 2));
console.log('First Row:', JSON.stringify(data[1], null, 2));
console.log('Total Rows:', data.length);
