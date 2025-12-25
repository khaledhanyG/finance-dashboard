
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';
const { Pool } = pg;


export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const client = await pool.connect();


  try {
    if (req.method === 'POST') {
      const {
        id, date, journalNo, categoryId, departmentId, employeeId,
        amount, amountPaid, remainingAmount, description
      } = req.body;

      await client.query(
        `INSERT INTO "ExpenseEntry" 
         ("id", "date", "journalNo", "categoryId", "departmentId", "employeeId", "amount", "amountPaid", "remainingAmount", "description") 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [id, date, journalNo, categoryId, departmentId, employeeId, amount, amountPaid, remainingAmount, description]
      );

      // If there is an outstanding amount, create the outstanding entry too (logic moved from frontend to API or frontend sends separate request? 
      // Frontend sends separate request based on App.tsx logic. App.tsx calls onAddOutstanding separately.
      res.status(200).json({ success: true });

    } else if (req.method === 'PUT') {
      const {
        id, date, journalNo, categoryId, departmentId, employeeId,
        amount, amountPaid, remainingAmount, description
      } = req.body;

      await client.query(
        `UPDATE "ExpenseEntry" SET 
         "date"=$2, "journalNo"=$3, "categoryId"=$4, "departmentId"=$5, "employeeId"=$6, 
         "amount"=$7, "amountPaid"=$8, "remainingAmount"=$9, "description"=$10
         WHERE "id"=$1`,
        [id, date, journalNo, categoryId, departmentId, employeeId, amount, amountPaid, remainingAmount, description]
      );
      res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query('BEGIN');
      await client.query('DELETE FROM "OutstandingExpense" WHERE "expenseId" = $1', [id]);
      await client.query('DELETE FROM "ExpenseEntry" WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.status(200).json({ success: true });
    } else {
      res.status(405).send('Method Not Allowed');
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
    await pool.end();
  }
}
