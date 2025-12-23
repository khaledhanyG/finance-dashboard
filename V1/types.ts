
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
  departmentId?: string; // Made optional as it's removed from form
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
  departments: Department[];
  employees: Employee[];
  expenseGroups: ExpenseGroup[];
  expenseCategories: ExpenseCategory[];
  incomeServices: IncomeService[];
  expenseEntries: ExpenseEntry[];
  incomeEntries: IncomeEntry[];
  outstandingExpenses: OutstandingExpense[];
  tasks: Task[];
}
