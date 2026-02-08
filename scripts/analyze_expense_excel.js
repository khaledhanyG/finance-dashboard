
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '../ExpenseEntry.xlsx');
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet); // Objects

const depts = new Set();
const cats = new Set();
let missingDeptCount = 0;

data.forEach(row => {
    if (row.departmentId) depts.add(row.departmentId);
    else missingDeptCount++;
    
    if (row.categoryId) cats.add(row.categoryId);
});

console.log(`Total Rows: ${data.length}`);
console.log(`Missing departmentId count: ${missingDeptCount}`);
console.log('Unique Departments:', Array.from(depts));
console.log('Sample Categories:', Array.from(cats).slice(0, 10));
