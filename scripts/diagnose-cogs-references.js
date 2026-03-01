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

async function main() {
  const client = await pool.connect();
  try {
    const totalRes = await client.query('SELECT COUNT(*) AS total FROM "IncomeCogsItem"');
    const orphanRes = await client.query(`
      SELECT COUNT(*) AS orphan
      FROM "IncomeCogsItem" i
      LEFT JOIN "ExpenseCategory" ec ON ec.id = i."categoryId"
      WHERE ec.id IS NULL
    `);
    const orphanTopRes = await client.query(`
      SELECT i."categoryId", COUNT(*)::int AS cnt
      FROM "IncomeCogsItem" i
      LEFT JOIN "ExpenseCategory" ec ON ec.id = i."categoryId"
      WHERE ec.id IS NULL
      GROUP BY i."categoryId"
      ORDER BY cnt DESC
      LIMIT 30
    `);
    const cogsCategoriesRes = await client.query(`
      SELECT COUNT(*) AS cogs_cats
      FROM "ExpenseCategory" ec
      JOIN "ExpenseGroup" eg ON eg.id = ec."groupId"
      WHERE eg."isCOGS" = true
    `);
    const nonCogsReferencedRes = await client.query(`
      SELECT ec.id, ec.name, eg.name AS group_name, COUNT(i.id)::int AS ref_count
      FROM "IncomeCogsItem" i
      JOIN "ExpenseCategory" ec ON ec.id = i."categoryId"
      JOIN "ExpenseGroup" eg ON eg.id = ec."groupId"
      WHERE eg."isCOGS" = false
      GROUP BY ec.id, ec.name, eg.name
      ORDER BY ref_count DESC
      LIMIT 30
    `);

    console.log('IncomeCogsItem total:', totalRes.rows[0].total);
    console.log('Orphan IncomeCogsItem references:', orphanRes.rows[0].orphan);
    console.log('COGS categories currently configured:', cogsCategoriesRes.rows[0].cogs_cats);

    console.log('\nTop orphan categoryIds (missing ExpenseCategory):');
    if (orphanTopRes.rows.length === 0) {
      console.log('  none');
    } else {
      orphanTopRes.rows.forEach(r => console.log(`  ${r.categoryId} -> ${r.cnt}`));
    }

    console.log('\nReferenced categories not in COGS groups:');
    if (nonCogsReferencedRes.rows.length === 0) {
      console.log('  none');
    } else {
      nonCogsReferencedRes.rows.forEach(r => console.log(`  ${r.id} (${r.name}) in [${r.group_name}] -> ${r.ref_count}`));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
