
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

const TABLE_MAP: Record<string, string> = {
  departments: 'Department',
  employees: 'Employee',
  expenseGroups: 'ExpenseGroup',
  expenseCategories: 'ExpenseCategory',
  incomeServices: 'IncomeService',
  tasks: 'Task'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await pool.connect();
  const { entity } = req.query;
  const tableName = TABLE_MAP[entity as string];

  if (!tableName) return res.status(400).json({ error: 'Invalid entity' });

  try {
    if (req.method === 'POST') {
      const data = req.body;
      const columns = Object.keys(data).map(k => `"${k}"`).join(',');
      const values = Object.values(data);
      const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
      
      const query = `INSERT INTO "${tableName}" (${columns}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${Object.keys(data).map((k, i) => `"${k}"=$${i+1}`).join(',')}`;
      
      // Note: ON CONFLICT requires a constraint. All my tables have PRIMARY KEY (id), so this works as UPSERT.
      await client.query(query, values);
      res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query(`DELETE FROM "${tableName}" WHERE id = $1`, [id]);
      res.status(200).json({ success: true });
    } else {
      res.status(405).send('Method Not Allowed');
    }
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
}
