
import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  departments: [],
  employees: [],
  expenseGroups: [],
  expenseCategories: [],
  incomeServices: [],
  expenseEntries: [],
  incomeEntries: [],
  outstandingExpenses: [],
  // Adding missing tasks property to match AppState interface
  tasks: []
};
