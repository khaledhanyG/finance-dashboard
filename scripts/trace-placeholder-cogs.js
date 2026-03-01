import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PLACEHOLDER_ID = 'cat-1766658698744';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const refs = await client.query(`
      SELECT i.id AS cogs_item_id, i."incomeEntryId", i.amount,
             ie.date, ie.description, ie."serviceId"
      FROM "IncomeCogsItem" i
      LEFT JOIN "IncomeEntry" ie ON ie.id = i."incomeEntryId"
      WHERE i."categoryId" = $1
      ORDER BY ie.date DESC NULLS LAST
    `, [PLACEHOLDER_ID]);

    const cogsCats = await client.query(`
      SELECT ec.id, ec.name
      FROM "ExpenseCategory" ec
      JOIN "ExpenseGroup" eg ON eg.id = ec."groupId"
      WHERE eg."isCOGS" = true
      ORDER BY ec.name
    `);

    console.log('Placeholder references:', refs.rowCount);
    refs.rows.forEach((r, idx) => {
      console.log(`\n[${idx + 1}] incomeEntryId=${r.incomeEntryId}`);
      console.log(`date=${r.date ? r.date.toISOString().slice(0,10) : 'n/a'} amount=${r.amount}`);
      console.log(`description=${r.description || ''}`);
      console.log(`serviceId=${r.serviceId || ''}`);
    });

    console.log('\nCurrent COGS categories:');
    cogsCats.rows.forEach(c => console.log(`- ${c.id} :: ${c.name}`));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
