import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_KyDZdMAUWe09@ep-small-river-ah71uyhl-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const createTables = async () => {
  const client = await pool.connect();
  try {
    console.log("Connected to database...");

    await client.query("BEGIN");

    // Department
    await client.query(`
            CREATE TABLE IF NOT EXISTS "Department" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL
            );
        `);
    console.log("Created Department table");

    // Employee
    await client.query(`
            CREATE TABLE IF NOT EXISTS "Employee" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "employeeNumber" TEXT NOT NULL,
                "departmentId" TEXT NOT NULL, 
                "salary" DECIMAL(10, 2) NOT NULL,
                "nationality" TEXT NOT NULL,
                "isActive" BOOLEAN NOT NULL
            );
        `);
    console.log("Created Employee table");

    // ExpenseGroup
    await client.query(`
            CREATE TABLE IF NOT EXISTS "ExpenseGroup" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL,
                "isCOGS" BOOLEAN NOT NULL
            );
        `);
    console.log("Created ExpenseGroup table");

    // ExpenseCategory
    await client.query(`
            CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
                "id" TEXT PRIMARY KEY,
                "groupId" TEXT NOT NULL, 
                "name" TEXT NOT NULL
            );
        `);
    console.log("Created ExpenseCategory table");

    // IncomeService
    await client.query(`
            CREATE TABLE IF NOT EXISTS "IncomeService" (
                "id" TEXT PRIMARY KEY,
                "name" TEXT NOT NULL
            );
        `);
    console.log("Created IncomeService table");

    // ExpenseEntry
    await client.query(`
            CREATE TABLE IF NOT EXISTS "ExpenseEntry" (
                "id" TEXT PRIMARY KEY,
                "date" TIMESTAMP NOT NULL,
                "journalNo" TEXT NOT NULL,
                "categoryId" TEXT NOT NULL, 
                "departmentId" TEXT NOT NULL,
                "employeeId" TEXT,
                "amount" DECIMAL(10, 2) NOT NULL,
                "amountPaid" DECIMAL(10, 2) NOT NULL,
                "remainingAmount" DECIMAL(10, 2) NOT NULL,
                "description" TEXT NOT NULL
            );
        `);
    console.log("Created ExpenseEntry table");

    // OutstandingExpense
    await client.query(`
            CREATE TABLE IF NOT EXISTS "OutstandingExpense" (
                "id" TEXT PRIMARY KEY,
                "expenseId" TEXT NOT NULL,
                "date" TIMESTAMP NOT NULL,
                "amount" DECIMAL(10, 2) NOT NULL,
                "departmentId" TEXT NOT NULL,
                "description" TEXT NOT NULL
            );
        `);
    console.log("Created OutstandingExpense table");

    // IncomeEntry
    await client.query(`
            CREATE TABLE IF NOT EXISTS "IncomeEntry" (
                "id" TEXT PRIMARY KEY,
                "date" TIMESTAMP NOT NULL,
                "serviceId" TEXT NOT NULL,
                "departmentId" TEXT,
                "type" TEXT,
                "amount" DECIMAL(10, 2) NOT NULL,
                "ordersCount" TEXT NOT NULL,
                "grossOrdersCount" TEXT,
                "cogs" DECIMAL(10, 2) NOT NULL,
                "totalRefundsAmount" DECIMAL(10, 2) NOT NULL,
                "totalInspectorShareCancelled" DECIMAL(10, 2) NOT NULL,
                "description" TEXT NOT NULL
            );
        `);
    console.log("Created IncomeEntry table");

    // IncomeCogsItem (Sub-table for IncomeEntry)
    await client.query(`
            CREATE TABLE IF NOT EXISTS "IncomeCogsItem" (
                "id" TEXT PRIMARY KEY,
                "incomeEntryId" TEXT NOT NULL,
                "categoryId" TEXT NOT NULL,
                "amount" DECIMAL(10, 2) NOT NULL
            );
        `);
    console.log("Created IncomeCogsItem table");

    // IncomeRefundItem (Sub-table for IncomeEntry)
    await client.query(`
            CREATE TABLE IF NOT EXISTS "IncomeRefundItem" (
                "id" TEXT PRIMARY KEY,
                "incomeEntryId" TEXT NOT NULL,
                "ordersCount" INTEGER NOT NULL,
                "amountRefunded" DECIMAL(10, 2) NOT NULL,
                "inspectorShareCancelled" DECIMAL(10, 2) NOT NULL
            );
        `);
    console.log("Created IncomeRefundItem table");

    // Task
    await client.query(`
            CREATE TABLE IF NOT EXISTS "Task" (
                "id" TEXT PRIMARY KEY,
                "address" TEXT NOT NULL,
                "notes" TEXT NOT NULL,
                "status" TEXT NOT NULL,
                "createdAt" TIMESTAMP NOT NULL
            );
        `);
    console.log("Created Task table");

    await client.query("COMMIT");
    console.log("All tables created successfully.");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error creating tables:", e);
  } finally {
    client.release();
    await pool.end();
  }
};

createTables();
