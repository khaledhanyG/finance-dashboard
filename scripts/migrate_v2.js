
import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  try {
    console.log("Starting migration...");

    // 1. Create Company table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Company" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL
      );
    `);
    console.log("Created Company table.");

    // 2. Create Bank table (or update)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Bank" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "balance" NUMERIC DEFAULT 0
      );
    `);
    // Add companyId to Bank
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Bank' AND column_name='companyId') THEN
          ALTER TABLE "Bank" ADD COLUMN "companyId" TEXT REFERENCES "Company"("id") ON DELETE SET NULL;
        END IF;
      END
      $$;
    `);
    console.log("Updated Bank table.");

    // 3. Create CashFlowItem table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CashFlowItem" (
        "id" TEXT PRIMARY KEY,
        "date" DATE NOT NULL,
        "amount" NUMERIC NOT NULL,
        "type" TEXT NOT NULL,
        "description" TEXT,
        "categoryId" TEXT,
        "bankId" TEXT REFERENCES "Bank"("id") ON DELETE SET NULL
      );
    `);
    // Add companyId to CashFlowItem
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CashFlowItem' AND column_name='companyId') THEN
          ALTER TABLE "CashFlowItem" ADD COLUMN "companyId" TEXT REFERENCES "Company"("id") ON DELETE CASCADE;
        END IF;
      END
      $$;
    `);
    console.log("Updated CashFlowItem table.");

    console.log("Migration complete.");
  } catch (e) {
    console.error("Migration failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
