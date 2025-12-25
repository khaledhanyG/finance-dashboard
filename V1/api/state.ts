
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

// Helper to map DB rows to Types
const mapEmployee = (row: any) => ({
  id: row.id,
  name: row.name,
  employeeNumber: row.employeeNumber,
  departmentId: row.departmentId,
  salary: Number(row.salary),
  nationality: row.nationality,
  isActive: row.isActive
});

const mapExpense = (row: any) => ({
  id: row.id,
  date: row.date.toISOString().split('T')[0],
  journalNo: row.journalNo,
  categoryId: row.categoryId,
  departmentId: row.departmentId,
  employeeId: row.employeeId,
  amount: Number(row.amount),
  amountPaid: Number(row.amountPaid),
  remainingAmount: Number(row.remainingAmount),
  description: row.description
});

const mapIncome = (row: any) => ({
  id: row.id,
  date: row.date.toISOString().split('T')[0],
  serviceId: row.serviceId,
  departmentId: row.departmentId,
  type: row.type as 'revenue' | 'refund',
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

const mapTask = (row: any) => ({
  id: row.id,
  address: row.address,
  notes: row.notes,
  status: row.status,
  createdAt: row.createdAt.toISOString()
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  // DIAGNOSTIC START: explicitly check env var before doing ANYTHING else
  if (!process.env.DATABASE_URL) {
    console.error("Critical: DATABASE_URL is undefined");
    return res.status(500).json({ error: "CONFIGURATION ERROR: DATABASE_URL is missing from Vercel Environment Variables. Please add it in Settings." });
  }

  // Create pool locally for this request to ensure no global crashes
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect().catch(e => {
    console.error("Connection Failed:", e);
    throw new Error(`DB Connection Failed: ${e.message} (Host: ${process.env.DATABASE_URL?.split('@')[1]?.split(':')[0] || 'unknown'})`);
  });

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

    const incomeEntries = incRes.rows.map(mapIncome).map(inc => ({
      ...inc,
      cogsItems: cogsRes.rows.filter((c: any) => c.incomeEntryId === inc.id).map((c: any) => ({ ...c, amount: Number(c.amount) })),
      refunds: refRes.rows.filter((r: any) => r.incomeEntryId === inc.id).map((r: any) => ({ ...r, amountRefunded: Number(r.amountRefunded), inspectorShareCancelled: Number(r.inspectorShareCancelled) }))
    }));

    const state = {
      departments: depRes.rows,
      employees: empRes.rows.map(mapEmployee),
      expenseGroups: grpRes.rows.map((r: any) => ({ ...r, isCOGS: r.isCOGS })),
      expenseCategories: catRes.rows,
      incomeServices: svcRes.rows,
      expenseEntries: expRes.rows.map(mapExpense),
      outstandingExpenses: outRes.rows.map((r: any) => ({ ...r, amount: Number(r.amount), date: r.date.toISOString().split('T')[0] })),
      incomeEntries,
      tasks: taskRes.rows.map(mapTask)
    };

    res.status(200).json(state);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
    await pool.end(); // Close local pool
  }
}
