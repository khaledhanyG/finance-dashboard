
import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  users: [], // Users are now loaded from database
  currentUser: null,
  departments: [],
  employees: [],
  expenseGroups: [],
  expenseCategories: [],
  incomeServices: [],
  expenseEntries: [],
  incomeEntries: [],
  outstandingExpenses: [],
  tasks: [],
  companies: [],
  banks: [],
  cashFlowForecast: []
};
