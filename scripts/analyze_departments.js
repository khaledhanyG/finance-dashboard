
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
const data = XLSX.utils.sheet_to_json(sheet);

let hasDept = 0;
let missingDept = 0;
const depts = new Set();

data.forEach(row => {
    if (row.departmentId) {
        hasDept++;
        depts.add(row.departmentId);
    } else {
        missingDept++;
    }
});

console.log(`Total Rows: ${data.length}`);
console.log(`With DepartmentId: ${hasDept}`);
console.log(`Missing DepartmentId: ${missingDept}`);
console.log('Unique Departments found:', Array.from(depts));
