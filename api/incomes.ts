
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
        id, date, serviceId, departmentId, type, amount, ordersCount, grossOrdersCount,
        cogs, cogsItems, refunds, totalRefundsAmount, totalInspectorShareCancelled, description
      } = req.body;

      await client.query('BEGIN');

      // Check if exists for Update vs Insert (Frontend uses the same logic? App.tsx separates Add and Update)
      // We'll perform an Upsert or just Delete then Insert for simplicity of nested items?
      // Or check if ID exists.
      const check = await client.query('SELECT 1 FROM "IncomeEntry" WHERE id = $1', [id]);

      if (check.rowCount > 0) {
        // Update
        await client.query(`
            UPDATE "IncomeEntry" SET 
            "date"=$2, "serviceId"=$3, "departmentId"=$4, "type"=$5, "amount"=$6, "ordersCount"=$7, 
            "grossOrdersCount"=$8, "cogs"=$9, "totalRefundsAmount"=$10, "totalInspectorShareCancelled"=$11, "description"=$12
            WHERE id = $1
        `, [id, date, serviceId, departmentId, type, amount, ordersCount, grossOrdersCount, cogs, totalRefundsAmount, totalInspectorShareCancelled, description]);

        // Clear sub-items and re-insert
        await client.query('DELETE FROM "IncomeCogsItem" WHERE "incomeEntryId" = $1', [id]);
        await client.query('DELETE FROM "IncomeRefundItem" WHERE "incomeEntryId" = $1', [id]);

      } else {
        // Insert
        await client.query(`
            INSERT INTO "IncomeEntry" 
            ("id", "date", "serviceId", "departmentId", "type", "amount", "ordersCount", "grossOrdersCount", "cogs", "totalRefundsAmount", "totalInspectorShareCancelled", "description")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [id, date, serviceId, departmentId, type, amount, ordersCount, grossOrdersCount, cogs, totalRefundsAmount, totalInspectorShareCancelled, description]);
      }

      if (cogsItems && cogsItems.length > 0) {
        for (const item of cogsItems) {
          await client.query(
            'INSERT INTO "IncomeCogsItem" ("id", "incomeEntryId", "categoryId", "amount") VALUES ($1, $2, $3, $4)',
            [item.id, id, item.categoryId, item.amount]
          );
        }
      }

      if (refunds && refunds.length > 0) {
        for (const item of refunds) {
          await client.query(
            'INSERT INTO "IncomeRefundItem" ("id", "incomeEntryId", "ordersCount", "amountRefunded", "inspectorShareCancelled") VALUES ($1, $2, $3, $4, $5)',
            [item.id, id, item.ordersCount, item.amountRefunded, item.inspectorShareCancelled]
          );
        }
      }

      await client.query('COMMIT');
      res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query('BEGIN');
      await client.query('DELETE FROM "IncomeCogsItem" WHERE "incomeEntryId" = $1', [id]);
      await client.query('DELETE FROM "IncomeRefundItem" WHERE "incomeEntryId" = $1', [id]);
      await client.query('DELETE FROM "IncomeEntry" WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.status(200).json({ success: true });

    } else {
      res.status(405).send('Method Not Allowed');
    }
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
    await pool.end();
  }
}
