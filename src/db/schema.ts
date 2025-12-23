import { pgTable, serial, text, decimal, timestamp, integer, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Departments
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const departmentsRelations = relations(departments, ({ many }) => ({
  employees: many(employees),
  expenses: many(expenses),
}));

// 2. Employees
export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  department: one(departments, {
    fields: [employees.departmentId],
    references: [departments.id],
  }),
  expenses: many(expenses),
}));

// 3. Expense Groups
export const expenseGroups = pgTable("expense_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseGroupsRelations = relations(expenseGroups, ({ many }) => ({
  categories: many(expenseCategories),
}));

// 4. Expense Categories
export const expenseCategories = pgTable("expense_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  groupId: integer("group_id").references(() => expenseGroups.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseCategoriesRelations = relations(expenseCategories, ({ one, many }) => ({
  group: one(expenseGroups, {
    fields: [expenseCategories.groupId],
    references: [expenseGroups.id],
  }),
  expenses: many(expenses),
}));

// 5. Income Services
export const incomeServices = pgTable("income_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 6. Expenses
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  journalNumber: text("journal_number").notNull(),
  date: date("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => expenseCategories.id).notNull(),
  departmentId: integer("department_id").references(() => departments.id).notNull(),
  employeeId: integer("employee_id").references(() => employees.id), // Optional
  createdAt: timestamp("created_at").defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  category: one(expenseCategories, {
    fields: [expenses.categoryId],
    references: [expenseCategories.id],
  }),
  department: one(departments, {
    fields: [expenses.departmentId],
    references: [departments.id],
  }),
  employee: one(employees, {
    fields: [expenses.employeeId],
    references: [employees.id],
  }),
}));
