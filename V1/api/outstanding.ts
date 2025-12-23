
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await pool.connect();
  try {
    if (req.method === 'POST') {
      const { id, expenseId, date, amount, departmentId, description } = req.body;
      await client.query(
        `INSERT INTO "OutstandingExpense" ("id", "expenseId", "date", "amount", "departmentId", "description") VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, expenseId, date, amount, departmentId, description]
      );
      res.status(200).json({ success: true });
    } else if (req.method === 'PUT') {
      // Settle payment (partial update)
      const { id, amount } = req.body; // New remaining amount
      const { expenseId, amountPaid, remainingExpense } = req.body; // To update the parent expense too?
      // Frontend logic is complex for settlement.
      // Settle logic in App.tsx:
      // 1. Updates OutstandingExpense (amount) OR deletes it if 0.
      // 2. Updates ExpenseEntry (amountPaid, remainingAmount).
      
      // Let's rely on frontend sending the exact queries or handle it transactionally.
      // For simplicity matching the frontend arguments, let's accept an "Action" type.
      
      const { action } = req.query;
      
      if (action === 'settle') {
          const { outstandingId, newOutstandingAmount, expenseId, newExpensePaid, newExpenseRemaining } = req.body;
          
          await client.query('BEGIN');
          // Update Expense
          await client.query('UPDATE "ExpenseEntry" SET "amountPaid" = $1, "remainingAmount" = $2 WHERE id = $3', [newExpensePaid, newExpenseRemaining, expenseId]);
          
          if (newOutstandingAmount <= 0) {
              await client.query('DELETE FROM "OutstandingExpense" WHERE id = $1', [outstandingId]);
          } else {
              await client.query('UPDATE "OutstandingExpense" SET "amount" = $1 WHERE id = $2', [newOutstandingAmount, outstandingId]);
          }
          await client.query('COMMIT');
          res.status(200).json({ success: true });
      }

    } else {
      res.status(405).send('Method Not Allowed');
    }
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
}
