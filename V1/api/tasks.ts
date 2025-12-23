
import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const client = await pool.connect();
  try {
    if (req.method === 'POST') {
      const { id, address, notes, status, createdAt } = req.body;
      // Upsert: simpler for tasks as update uses same form
      const check = await client.query('SELECT 1 FROM "Task" WHERE id = $1', [id]);
      if (check.rowCount > 0) {
         await client.query(
            'UPDATE "Task" SET address=$2, notes=$3, status=$4 WHERE id = $1',
            [id, address, notes, status]
         );
      } else {
         await client.query(
            'INSERT INTO "Task" ("id", "address", "notes", "status", "createdAt") VALUES ($1, $2, $3, $4, $5)',
            [id, address, notes, status, createdAt]
         );
      }
      res.status(200).json({ success: true });

    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      await client.query('DELETE FROM "Task" WHERE id = $1', [id]);
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
