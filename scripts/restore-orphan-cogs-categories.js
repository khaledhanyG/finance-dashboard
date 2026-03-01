import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function deriveName(categoryId) {
  if (categoryId === 'cat-Inspector share') return 'Inspector share';
  if (categoryId === 'cat-Payment Gateway') return 'Bank fees';
  if (categoryId.startsWith('cat-')) {
    const raw = categoryId.slice(4);
    if (/^\d+$/.test(raw)) return `Recovered COGS ${raw}`;
    return raw;
  }
  return `Recovered ${categoryId}`;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cogsGroupRes = await client.query('SELECT id FROM "ExpenseGroup" WHERE "isCOGS" = true ORDER BY id LIMIT 1');
    let cogsGroupId = cogsGroupRes.rows[0]?.id;

    if (!cogsGroupId) {
      cogsGroupId = 'grp-recovered-cogs';
      await client.query(
        'INSERT INTO "ExpenseGroup" (id, name, "isCOGS") VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [cogsGroupId, 'Recovered COGS', true]
      );
    }

    const orphanRes = await client.query(`
      SELECT DISTINCT i."categoryId"
      FROM "IncomeCogsItem" i
      LEFT JOIN "ExpenseCategory" ec ON ec.id = i."categoryId"
      WHERE ec.id IS NULL
    `);

    let inserted = 0;
    for (const row of orphanRes.rows) {
      const categoryId = row.categoryId;
      const name = deriveName(categoryId);
      await client.query(
        'INSERT INTO "ExpenseCategory" (id, "groupId", name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING',
        [categoryId, cogsGroupId, name]
      );
      inserted++;
    }

    await client.query('COMMIT');

    console.log('Recovery completed.');
    console.log('COGS group used:', cogsGroupId);
    console.log('Recovered/ensured categories:', inserted);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Recovery failed:', error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
