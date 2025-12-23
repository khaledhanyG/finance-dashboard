'use server';

import { db } from '@/db';
import { departments, employees, expenseGroups, expenseCategories, incomeServices } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

// --- Departments ---
export async function getDepartments() {
  return await db.select().from(departments);
}

export async function createDepartment(name: string) {
  await db.insert(departments).values({ name });
  revalidatePath('/settings');
}

export async function deleteDepartment(id: number) {
  await db.delete(departments).where(eq(departments.id, id));
  revalidatePath('/settings');
}

// --- Employees ---
export async function getEmployees() {
  return await db.query.employees.findMany({
    with: { department: true }
  });
}

export async function createEmployee(data: { name: string; departmentId: number; salary: string }) {
  await db.insert(employees).values({
    name: data.name,
    departmentId: data.departmentId,
    salary: data.salary
  });
  revalidatePath('/settings');
}

export async function deleteEmployee(id: number) {
  await db.delete(employees).where(eq(employees.id, id));
  revalidatePath('/settings');
}

// --- Expenses Config ---
export async function getExpenseGroups() {
  return await db.query.expenseGroups.findMany({
    with: { categories: true }
  });
}

export async function createExpenseGroup(name: string) {
  await db.insert(expenseGroups).values({ name });
  revalidatePath('/settings');
}

export async function createExpenseCategory(name: string, groupId: number) {
  await db.insert(expenseCategories).values({ name, groupId });
  revalidatePath('/settings');
}

export async function deleteExpenseGroup(id: number) {
  await db.delete(expenseGroups).where(eq(expenseGroups.id, id));
  revalidatePath('/settings');
}

export async function deleteExpenseCategory(id: number) {
  await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
  revalidatePath('/settings');
}

// --- Income Services ---
export async function getIncomeServices() {
  return await db.select().from(incomeServices);
}

export async function createIncomeService(name: string) {
  await db.insert(incomeServices).values({ name });
  revalidatePath('/settings');
}

export async function deleteIncomeService(id: number) {
  await db.delete(incomeServices).where(eq(incomeServices.id, id));
  revalidatePath('/settings');
}
