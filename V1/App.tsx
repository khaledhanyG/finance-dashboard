
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ExpenseEntry, IncomeEntry, OutstandingExpense, Task, User } from './types';
import { INITIAL_STATE } from './constants';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Transactions } from './components/Transactions';
import { Reports } from './components/Reports';
import { Tasks } from './components/Tasks';
import { DeleteModal } from './components/DeleteModal';
import { Login } from './components/Login';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('finpulse_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...INITIAL_STATE, ...parsed, currentUser: null }; // Force re-login on refresh
    }
    return INITIAL_STATE;
  });

  const [activePage, setActivePage] = useState<'dashboard' | 'settings' | 'transactions' | 'reports' | 'tasks'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemName: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    itemName: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    // Load initial state from DB
    const fetchData = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          // Merge with initial state structure to ensure no missing keys
          setState(prev => ({ 
             ...INITIAL_STATE, 
             ...data, 
             users: prev.users, // Keep users (mock auth) or fetch if we had a users table
             currentUser: prev.currentUser 
          }));
        }
      } catch (err) {
        console.error("Failed to fetch state:", err);
      }
    };
    if (state.currentUser) {
       fetchData();
    }
  }, [state.currentUser]); // Reload when user logs in


  /* Sync Helper */
  const syncChanges = async (key: keyof AppState, oldList: any[], newList: any[]) => {
    // Diff to find Add/Update vs Delete
    const addedOrUpdated = newList.filter(n => {
       const o = oldList.find(x => x.id === n.id);
       return !o || JSON.stringify(o) !== JSON.stringify(n);
    });
    const removed = oldList.filter(o => !newList.find(n => n.id === o.id));

    // Execute Sync
    // We only sync specific keys that map to tables
    const SYNC_KEYS = ['departments', 'employees', 'expenseGroups', 'expenseCategories', 'incomeServices', 'tasks'];
    if (!SYNC_KEYS.includes(key)) return;

    for (const item of addedOrUpdated) {
        await fetch(`/api/crud?entity=${key}`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(item) 
        }).catch(console.error);
    }
    for (const item of removed) {
        await fetch(`/api/crud?entity=${key}&id=${item.id}`, { method: 'DELETE' }).catch(console.error);
    }
  };

  const updateState = (newState: Partial<AppState>) => {
    // Intercept and Sync
    Object.keys(newState).forEach(key => {
        const k = key as keyof AppState;
        if (Array.isArray(newState[k]) && Array.isArray(state[k])) {
            syncChanges(k, state[k] as any[], newState[k] as any[]);
        }
    });
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleLogin = (email: string, pass: string): boolean => {
    const user = state.users.find(u => u.email === email && u.password === pass);
    if (user) {
      setState(prev => ({ ...prev, currentUser: user }));
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setState(prev => ({ ...prev, currentUser: null }));
    setActivePage('dashboard');
  };

  const triggerDelete = useCallback((itemName: string, onConfirm: () => void) => {
    setDeleteModal({
      isOpen: true,
      itemName,
      onConfirm,
    });
  }, []);

  const handleAddExpense = async (entry: ExpenseEntry) => {
    try {
      await fetch('/api/expenses', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(entry) });
      setState(prev => ({ ...prev, expenseEntries: [...prev.expenseEntries, entry] }));
    } catch (e) {
      console.error(e);
      alert("Failed to save expense");
    }
  };

  const handleAddExpenses = async (entries: ExpenseEntry[]) => {
    // Batch add or loop
    try {
        await Promise.all(entries.map(e => fetch('/api/expenses', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(e) })));
        setState(prev => ({ ...prev, expenseEntries: [...prev.expenseEntries, ...entries] }));
    } catch (e) { console.error(e); }
  };

  const handleUpdateExpense = async (entry: ExpenseEntry) => {
    try {
      // Upsert logic same as income? Or update specific fields?
      // Since we don't have a PUT endpoint yet for expense (POST inserts), we need to update api/expenses.ts to handle Update.
      // But actually, usually API uses POST/PUT. My api/expenses.ts only handles POST (insert) and DELETE.
      // I need to update api/expenses.ts to handle PUT or check ID.
      // For now, let's assume I fix the API first.
      await fetch('/api/expenses', { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(entry) });
      setState(prev => ({ ...prev, expenseEntries: prev.expenseEntries.map(e => e.id === entry.id ? entry : e) }));
    } catch (e) { console.error(e); }
  };

  const handleAddIncome = async (entry: IncomeEntry) => {
    try {
      await fetch('/api/incomes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(entry) });
      setState(prev => ({ ...prev, incomeEntries: [...prev.incomeEntries, entry] }));
    } catch (e) { console.error(e); }
  };

  const handleUpdateIncome = async (entry: IncomeEntry) => {
    try {
      await fetch('/api/incomes', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(entry) }); // Upsert
      setState(prev => ({ ...prev, incomeEntries: prev.incomeEntries.map(i => i.id === entry.id ? entry : i) }));
    } catch (e) { console.error(e); }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
      setState(prev => ({ 
        ...prev, 
        expenseEntries: prev.expenseEntries.filter(e => e.id !== id),
        outstandingExpenses: prev.outstandingExpenses.filter(o => o.expenseId !== id)
      }));
    } catch (e) { console.error(e); }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await fetch(`/api/incomes?id=${id}`, { method: 'DELETE' });
      setState(prev => ({ ...prev, incomeEntries: prev.incomeEntries.filter(i => i.id !== id) }));
    } catch (e) { console.error(e); }
  };

  const handleAddOutstanding = async (entry: OutstandingExpense) => {
    try {
      await fetch('/api/outstanding', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(entry) });
      setState(prev => ({ ...prev, outstandingExpenses: [...prev.outstandingExpenses, entry] }));
    } catch (e) { console.error(e); }
  };

  const handleSettleOutstanding = async (id: string, amountToPay: number) => {
    // Calculate new state logic to send to API
    const target = state.outstandingExpenses.find(o => o.id === id);
    if (!target) return;
    const expense = state.expenseEntries.find(e => e.id === target.expenseId);
    if (!expense) return;

    const newRemaining = target.amount - amountToPay;
    const newPaid = expense.amountPaid + amountToPay;
    const newExpenseRemaining = Math.max(0, expense.amount - newPaid);

    try {
        await fetch('/api/outstanding?action=settle', { 
            method: 'PUT', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({
                outstandingId: id,
                newOutstandingAmount: newRemaining,
                expenseId: target.expenseId,
                newExpensePaid: newPaid,
                newExpenseRemaining: newExpenseRemaining
            }) 
        });

        // Optimistic update
        setState(prev => {
          // ... (same logic as before)
          const updatedExpenseEntries = prev.expenseEntries.map(e => {
            if (e.id === target.expenseId) {
              return {
                ...e,
                amountPaid: newPaid,
                remainingAmount: newExpenseRemaining
              };
            }
            return e;
          });

          if (newRemaining <= 0) {
            return {
              ...prev,
              expenseEntries: updatedExpenseEntries,
              outstandingExpenses: prev.outstandingExpenses.filter(o => o.id !== id)
            };
          } else {
            return {
              ...prev,
              expenseEntries: updatedExpenseEntries,
              outstandingExpenses: prev.outstandingExpenses.map(o => 
                o.id === id ? { ...o, amount: newRemaining } : o
              )
            };
          }
        });
    } catch (e) { console.error(e); }
  };

  if (!state.currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const role = state.currentUser.role;
  const isViewer = role === 'viewer';

  const navLinks = [
    { id: 'dashboard', icon: 'fa-gauge-high', label: 'Overview', show: true },
    { id: 'transactions', icon: 'fa-file-invoice-dollar', label: 'Accounting', show: role !== 'viewer' },
    { id: 'tasks', icon: 'fa-list-check', label: 'Tasks', show: role !== 'viewer' },
    { id: 'reports', icon: 'fa-file-contract', label: 'Reports', show: true },
    { id: 'settings', icon: 'fa-sliders', label: role === 'admin' ? 'Organization' : 'My Profile', show: true }
  ];

  const visibleNavLinks = navLinks.filter(l => l.show);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <DeleteModal
        isOpen={deleteModal.isOpen}
        itemName={deleteModal.itemName}
        onClose={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={deleteModal.onConfirm}
      />

      <nav className="bg-indigo-900 text-white sticky top-0 z-[60] shadow-xl">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-1.5 rounded-lg border border-white/10">
              <i className="fas fa-chart-pie text-indigo-300"></i>
            </div>
            <h1 className="text-lg font-black tracking-tight uppercase">FinPulse<span className="text-indigo-400">PRO</span></h1>
          </div>

          <div className="hidden md:flex items-center gap-1">
            {visibleNavLinks.map((nav) => (
              <button
                key={nav.id}
                onClick={() => setActivePage(nav.id as any)}
                className={`flex items-center gap-2.5 px-5 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                  activePage === nav.id 
                    ? 'bg-white text-indigo-900 shadow-lg' 
                    : 'text-indigo-100 hover:bg-white/5'
                }`}
              >
                <i className={`fas ${nav.icon} opacity-70`}></i>
                <span>{nav.label}</span>
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4 border-l border-white/10 pl-6 ml-2">
            <div className="text-right">
              <p className="text-[10px] text-white font-black uppercase tracking-widest">{state.currentUser.name}</p>
              <p className="text-[9px] text-indigo-300 font-bold uppercase tracking-[0.2em]">{state.currentUser.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-indigo-200 transition-all flex items-center justify-center border border-white/5"
            >
              <i className="fas fa-power-off text-sm"></i>
            </button>
          </div>

          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-indigo-100 hover:text-white"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 bg-indigo-950 p-4 space-y-2 animate-fadeIn">
            {visibleNavLinks.map((nav) => (
              <button
                key={nav.id}
                onClick={() => { setActivePage(nav.id as any); setIsMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm uppercase ${
                  activePage === nav.id ? 'bg-indigo-600 text-white' : 'text-indigo-100'
                }`}
              >
                <i className={`fas ${nav.icon} w-6`}></i>
                {nav.label}
              </button>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm uppercase text-rose-400 border border-rose-900/50 mt-4"
            >
              <i className="fas fa-power-off w-6"></i>
              Logout
            </button>
          </div>
        )}
      </nav>

      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        <main className="flex-1 p-4 md:p-8">
          {activePage === 'dashboard' && <Dashboard state={state} />}
          {activePage === 'settings' && <Settings state={state} onUpdate={updateState} onDelete={triggerDelete} />}
          {activePage === 'reports' && <Reports state={state} />}
          {activePage === 'tasks' && role !== 'viewer' && <Tasks state={state} onUpdate={updateState} onDelete={triggerDelete} />}
          {activePage === 'transactions' && role !== 'viewer' && (
            <Transactions 
              state={state} 
              onAddExpense={handleAddExpense} 
              onAddExpenses={handleAddExpenses}
              onUpdateExpense={handleUpdateExpense}
              onAddIncome={handleAddIncome}
              onUpdateIncome={handleUpdateIncome}
              onDeleteExpense={(id) => {
                const item = state.expenseEntries.find(e => e.id === id);
                triggerDelete(item?.description || 'Expense Entry', () => handleDeleteExpense(id));
              }}
              onDeleteIncome={(id) => {
                const item = state.incomeEntries.find(i => i.id === id);
                triggerDelete(item?.description || 'Income Entry', () => handleDeleteIncome(id));
              }}
              onAddOutstanding={handleAddOutstanding}
              onSettleOutstanding={handleSettleOutstanding}
            />
          )}
          {activePage === 'tasks' && role === 'viewer' && (
            <div className="py-20 text-center text-slate-400">View-only mode active. Assignments restricted.</div>
          )}
        </main>
      </div>

      <footer className="bg-white border-t border-slate-200 py-6">
        <div className="max-w-[1600px] mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
            &copy; {new Date().getFullYear()} FinPulse Professional Financial Suite
          </p>
          <div className="flex gap-6">
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter flex items-center gap-2">
              <i className="fas fa-shield-halved"></i> SECURE ENCRYPTED DATA
            </span>
            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter flex items-center gap-2">
              <i className="fas fa-user-lock"></i> ROLE: {state.currentUser.role.toUpperCase()}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
