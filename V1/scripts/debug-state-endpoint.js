import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// Helper to map DB rows to Types (COPIED EXACTLY FROM api/state.ts)
const mapEmployee = (row) => ({
    id: row.id,
    name: row.name,
    employeeNumber: row.employeeNumber,
    departmentId: row.departmentId,
    salary: Number(row.salary),
    nationality: row.nationality,
    isActive: row.isActive
});

const mapExpense = (row) => ({
    id: row.id,
    date: new Date(row.date).toISOString().split('T')[0], // Simulate date handling
    journalNo: row.journalNo,
    categoryId: row.categoryId,
    departmentId: row.departmentId,
    employeeId: row.employeeId,
    amount: Number(row.amount),
    amountPaid: Number(row.amountPaid),
    remainingAmount: Number(row.remainingAmount),
    description: row.description
});

const mapIncome = (row) => ({
    id: row.id,
    date: new Date(row.date).toISOString().split('T')[0],
    serviceId: row.serviceId,
    departmentId: row.departmentId,
    type: row.type,
    amount: Number(row.amount),
    ordersCount: row.ordersCount,
    grossOrdersCount: row.grossOrdersCount,
    cogs: Number(row.cogs),
    cogsItems: [],
    refunds: [],
    totalRefundsAmount: Number(row.totalRefundsAmount),
    totalInspectorShareCancelled: Number(row.totalInspectorShareCancelled),
    description: row.description
});

const mapTask = (row) => ({
    id: row.id,
    address: row.address,
    notes: row.notes,
    status: row.status,
    createdAt: new Date(row.createdAt).toISOString()
});

async function debugState() {
    console.log('Simulating GET /api/state...');
    const client = await pool.connect();
    try {
        const [
            depRes, empRes, grpRes, catRes, svcRes,
            expRes, outRes, incRes, cogsRes, refRes, taskRes
        ] = await Promise.all([
            client.query('SELECT * FROM "Department"'),
            client.query('SELECT * FROM "Employee"'),
            client.query('SELECT * FROM "ExpenseGroup"'),
            client.query('SELECT * FROM "ExpenseCategory"'),
            client.query('SELECT * FROM "IncomeService"'),
            client.query('SELECT * FROM "ExpenseEntry"'),
            client.query('SELECT * FROM "OutstandingExpense"'),
            client.query('SELECT * FROM "IncomeEntry"'),
            client.query('SELECT * FROM "IncomeCogsItem"'),
            client.query('SELECT * FROM "IncomeRefundItem"'),
            client.query('SELECT * FROM "Task"')
        ]);

        console.log('Queries successful. Mapping data...');

        const incomeEntries = incRes.rows.map(mapIncome).map(inc => ({
            ...inc,
            cogsItems: cogsRes.rows.filter(c => c.incomeEntryId === inc.id).map(c => ({ ...c, amount: Number(c.amount) })),
            refunds: refRes.rows.filter(r => r.incomeEntryId === inc.id).map(r => ({ ...r, amountRefunded: Number(r.amountRefunded), inspectorShareCancelled: Number(r.inspectorShareCancelled) }))
        }));

        const state = {
            departments: depRes.rows,
            employees: empRes.rows.map(mapEmployee),
            expenseGroups: grpRes.rows.map(r => ({ ...r, isCOGS: r.isCOGS })),
            expenseCategories: catRes.rows,
            incomeServices: svcRes.rows,
            expenseEntries: expRes.rows.map(mapExpense),
            outstandingExpenses: outRes.rows.map(r => ({ ...r, amount: Number(r.amount), date: new Date(r.date).toISOString().split('T')[0] })),
            incomeEntries,
            tasks: taskRes.rows.map(mapTask)
        };

        console.log('State object constructed successfully.');
        console.log('Task Count:', state.tasks.length);
        console.log('Task Sample:', state.tasks[0]);

        // Check if any critical field is missing or undefined
        if (state.tasks.some(t => !t.id)) console.warn('WARNING: Some tasks missing ID');

    } catch (e) {
        console.error('State API simulation FAILED:', e);
        // console.error(e.stack);
    } finally {
        client.release();
        await pool.end();
    }
}

debugState();
