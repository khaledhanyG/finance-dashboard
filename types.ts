
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  permissions?: string[];
}

export interface Department {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  name: string;
  employeeNumber: string;
  departmentId: string;
  salary: number;
  nationality: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseGroup {
  id: string;
  name: string;
  isCOGS: boolean;
}

export interface ExpenseCategory {
  id: string;
  groupId: string;
  name: string;
}

export interface IncomeService {
  id: string;
  name: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  journalNo: string;
  categoryId: string;
  departmentId: string;
  employeeId: string | null;
  amount: number;
  amountPaid: number;
  remainingAmount: number;
  description: string;
  isShared?: boolean;
}

export interface OutstandingExpense {
  id: string;
  expenseId: string;
  date: string;
  amount: number;
  departmentId: string;
  description: string;
}

export interface IncomeCogsItem {
  id: string;
  categoryId: string;
  amount: number;
}

export interface IncomeRefundItem {
  id: string;
  ordersCount: number;
  amountRefunded: number;
  inspectorShareCancelled: number;
}

export interface IncomeEntry {
  id: string;
  date: string;
  serviceId: string;
  departmentId?: string;
  type?: 'revenue' | 'refund';
  amount: number; 
  ordersCount: string; 
  grossOrdersCount?: string; 
  cogs: number; 
  cogsItems: IncomeCogsItem[];
  refunds: IncomeRefundItem[];
  totalRefundsAmount: number;
  totalInspectorShareCancelled: number;
  description: string;
}

export type TaskStatus = 'in-progress' | 'completed';

export interface Task {
  id: string;
  address: string;
  notes: string;
  status: TaskStatus;
  createdAt: string;
}

export interface AppState {
  users: User[];
  currentUser: User | null;
  departments: Department[];
  employees: Employee[];
  expenseGroups: ExpenseGroup[];
  expenseCategories: ExpenseCategory[];
  incomeServices: IncomeService[];
  expenseEntries: ExpenseEntry[];
  incomeEntries: IncomeEntry[];
  outstandingExpenses: OutstandingExpense[];
  tasks: Task[];
  banks?: Bank[];
  cashFlowForecast?: CashFlowItem[];
}

export interface Company {
  id: string;
  name: string;
}

export interface Bank {
  id: string;
  name: string;
  balance: number;
  companyId?: string;
  currency?: string;
}

export interface CashFlowItem {
  id: string;
  companyId?: string;
  bankId?: string;
  date: string; // ISO date
  categoryId?: string;
  amount: number;
  type: 'expense' | 'inflow_b2b' | 'inflow_b2c';
  description?: string;
}
