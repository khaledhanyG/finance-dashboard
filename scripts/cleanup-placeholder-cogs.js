import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLACEHOLDER_ID = 'cat-1766658698744';
const TARGET_ID = 'cat-Payment Gateway'; // Bank fees

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const targetExists = await client.query('SELECT 1 FROM "ExpenseCategory" WHERE id = $1', [TARGET_ID]);
    if (targetExists.rowCount === 0) {
      throw new Error(`Target category not found: ${TARGET_ID}`);
    }

    const before = await client.query('SELECT COUNT(*) AS cnt FROM "IncomeCogsItem" WHERE "categoryId" = $1', [PLACEHOLDER_ID]);

    await client.query(
      'UPDATE "IncomeCogsItem" SET "categoryId" = $1 WHERE "categoryId" = $2',
      [TARGET_ID, PLACEHOLDER_ID]
    );

    await client.query('DELETE FROM "ExpenseCategory" WHERE id = $1', [PLACEHOLDER_ID]);

    const after = await client.query('SELECT COUNT(*) AS cnt FROM "IncomeCogsItem" WHERE "categoryId" = $1', [PLACEHOLDER_ID]);

    await client.query('COMMIT');

    console.log('Cleanup completed.');
    console.log(`Moved refs from ${PLACEHOLDER_ID} to ${TARGET_ID}:`, before.rows[0].cnt);
    console.log(`Remaining refs to ${PLACEHOLDER_ID}:`, after.rows[0].cnt);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
