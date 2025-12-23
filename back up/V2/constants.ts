
import { AppState } from './types';

export const INITIAL_STATE: AppState = {
  users: [
    { 
      id: 'admin-1', 
      email: 'khaled.hany@gmail.com', 
      password: '123456', 
      name: 'Khaled Hany', 
      role: 'admin' 
    }
  ],
  currentUser: null,
  departments: [],
  employees: [],
  expenseGroups: [],
  expenseCategories: [],
  incomeServices: [],
  expenseEntries: [],
  incomeEntries: [],
  outstandingExpenses: [],
  tasks: []
};
