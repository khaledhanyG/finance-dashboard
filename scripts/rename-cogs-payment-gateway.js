import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const CATEGORY_ID = 'cat-Payment Gateway';
const TARGET_NAME = 'Payment Gateway';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const before = await client.query('SELECT id, name FROM "ExpenseCategory" WHERE id = $1', [CATEGORY_ID]);
    if (before.rowCount === 0) {
      throw new Error(`Category not found: ${CATEGORY_ID}`);
    }

    await client.query('UPDATE "ExpenseCategory" SET name = $1 WHERE id = $2', [TARGET_NAME, CATEGORY_ID]);

    const after = await client.query('SELECT id, name FROM "ExpenseCategory" WHERE id = $1', [CATEGORY_ID]);

    console.log('Rename complete:');
    console.log('Before:', before.rows[0]);
    console.log('After :', after.rows[0]);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
