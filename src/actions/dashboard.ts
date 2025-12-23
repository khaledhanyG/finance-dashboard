'use server';

import { db } from '@/db';
import { expenses, departments, expenseCategories, expenseGroups } from '@/db/schema';
import { sql, eq, sum, desc, and, gte, lte } from 'drizzle-orm';

export async function getDashboardMetrics() {
  // For simplicity, we get all-time or last 30 days. Let's do all-time for now to see seed data.
  // In a real app, we'd accept start/end dates.
  
  const totalExpensesResult = await db.select({ value: sum(expenses.amount) }).from(expenses);
  const totalExpenses = Number(totalExpensesResult[0]?.value || 0);

  // Hardcoded revenue for demo since we don't have an income table fully fleshed out with transactions yet
  // but we have income services. Let's just mock revenue as (Expenses * 1.5) for positive net profit visual.
  const totalRevenue = totalExpenses * 1.65; 
  const netProfit = totalRevenue - totalExpenses;

  // Top spending department
  const deptExpenses = await db.select({
    name: departments.name,
    value: sum(expenses.amount)
  })
  .from(expenses)
  .leftJoin(departments, eq(expenses.departmentId, departments.id))
  .groupBy(departments.name)
  .orderBy(desc(sum(expenses.amount)))
  .limit(1);

  const topDept = deptExpenses[0]?.name || 'N/A';

  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    topDept
  };
}

export async function getExpensesByDepartment() {
  const data = await db.select({
    name: departments.name,
    value: sum(expenses.amount)
  })
  .from(expenses)
  .leftJoin(departments, eq(expenses.departmentId, departments.id))
  .groupBy(departments.name);

  return data.map(d => ({ ...d, value: Number(d.value) }));
}

export async function getExpensesByCategory() {
  const data = await db.select({
    name: expenseCategories.name,
    value: sum(expenses.amount)
  })
  .from(expenses)
  .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
  .groupBy(expenseCategories.name);

  return data.map(d => ({ ...d, value: Number(d.value) }));
}

export async function getRecentExpenses() {
  return await db.query.expenses.findMany({
    with: {
      category: true,
      department: true,
      employee: true
    },
    orderBy: desc(expenses.date),
    limit: 5
  });
}
