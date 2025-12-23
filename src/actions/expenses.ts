'use server';

import { db } from '@/db';
import { expenses, expenseCategories } from '@/db/schema';
import { revalidatePath } from 'next/cache';

export async function createExpense(data: {
  journalNumber: string;
  date: Date;
  amount: string;
  description: string;
  categoryId: number;
  departmentId: number;
  employeeId?: number | null;
}) {
  await db.insert(expenses).values({
    journalNumber: data.journalNumber,
    date: data.date.toISOString().split('T')[0], // Store as YYYY-MM-DD
    amount: data.amount,
    description: data.description,
    categoryId: data.categoryId,
    departmentId: data.departmentId,
    employeeId: data.employeeId || null,
  });
  revalidatePath('/');
  revalidatePath('/expenses');
}

export async function getCategoriesForForm() {
  return await db.query.expenseCategories.findMany({
    with: { group: true }
  });
}
