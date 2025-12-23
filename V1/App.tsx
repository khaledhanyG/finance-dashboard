
import React, { useState, useEffect, useCallback } from 'react';
import { AppState, ExpenseEntry, IncomeEntry, OutstandingExpense, Task } from './types';
import { INITIAL_STATE } from './constants';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Transactions } from './components/Transactions';
import { Reports } from './components/Reports';
import { Tasks } from './components/Tasks';
import { DeleteModal } from './components/DeleteModal';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('finpulse_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merging with INITIAL_STATE ensures new properties like 'tasks' exist in old saved data
      return { ...INITIAL_STATE, ...parsed };
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
    localStorage.setItem('finpulse_state', JSON.stringify(state));
  }, [state]);

  const updateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const triggerDelete = useCallback((itemName: string, onConfirm: () => void) => {
    setDeleteModal({
      isOpen: true,
      itemName,
      onConfirm,
    });
  }, []);

  const handleAddExpense = (entry: ExpenseEntry) => {
    setState(prev => ({ ...prev, expenseEntries: [...prev.expenseEntries, entry] }));
  };

  const handleAddExpenses = (entries: ExpenseEntry[]) => {
    setState(prev => ({ ...prev, expenseEntries: [...prev.expenseEntries, ...entries] }));
  };

  const handleUpdateExpense = (entry: ExpenseEntry) => {
    setState(prev => ({ ...prev, expenseEntries: prev.expenseEntries.map(e => e.id === entry.id ? entry : e) }));
  };

  const handleAddIncome = (entry: IncomeEntry) => {
    setState(prev => ({ ...prev, incomeEntries: [...prev.incomeEntries, entry] }));
  };

  const handleUpdateIncome = (entry: IncomeEntry) => {
    setState(prev => ({ ...prev, incomeEntries: prev.incomeEntries.map(i => i.id === entry.id ? entry : i) }));
  };

  const handleDeleteExpense = (id: string) => {
    setState(prev => ({ 
      ...prev, 
      expenseEntries: prev.expenseEntries.filter(e => e.id !== id),
      outstandingExpenses: prev.outstandingExpenses.filter(o => o.expenseId !== id)
    }));
  };

  const handleDeleteIncome = (id: string) => {
    setState(prev => ({ ...prev, incomeEntries: prev.incomeEntries.filter(i => i.id !== id) }));
  };

  const handleAddOutstanding = (entry: OutstandingExpense) => {
    setState(prev => ({ ...prev, outstandingExpenses: [...prev.outstandingExpenses, entry] }));
  };

  const handleSettleOutstanding = (id: string, amountToPay: number) => {
    setState(prev => {
      const target = prev.outstandingExpenses.find(o => o.id === id);
      if (!target) return prev;

      const newRemaining = target.amount - amountToPay;
      const updatedExpenseEntries = prev.expenseEntries.map(e => {
        if (e.id === target.expenseId) {
          const newPaid = e.amountPaid + amountToPay;
          return {
            ...e,
            amountPaid: newPaid,
            remainingAmount: Math.max(0, e.amount - newPaid)
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
  };

  const navLinks = [
    { id: 'dashboard', icon: 'fa-gauge-high', label: 'Dashboard' },
    { id: 'transactions', icon: 'fa-file-invoice-dollar', label: 'Accounting' },
    { id: 'tasks', icon: 'fa-list-check', label: 'Tasks' },
    { id: 'reports', icon: 'fa-file-contract', label: 'Reports' },
    { id: 'settings', icon: 'fa-sliders', label: 'Organization' }
  ];

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
            {navLinks.map((nav) => (
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
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('en-SA', { month: 'short', day: 'numeric' })}</p>
              <p className="text-[9px] text-white/50 font-medium">FINANCIAL YEAR 2024</p>
            </div>
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
            {navLinks.map((nav) => (
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
          </div>
        )}
      </nav>

      <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
        <main className="flex-1 p-4 md:p-8">
          <div className="mb-8 flex items-center gap-3">
             <div className="h-8 w-1.5 bg-indigo-600 rounded-full"></div>
             <div>
                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                  {navLinks.find(n => n.id === activePage)?.label}
                </h2>
                <div className="h-0.5 w-12 bg-slate-200 mt-1"></div>
             </div>
          </div>
          
          {activePage === 'dashboard' && <Dashboard state={state} />}
          {activePage === 'settings' && <Settings state={state} onUpdate={updateState} onDelete={triggerDelete} />}
          {activePage === 'reports' && <Reports state={state} />}
          {activePage === 'tasks' && <Tasks state={state} onUpdate={updateState} onDelete={triggerDelete} />}
          {activePage === 'transactions' && (
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
              <i className="fas fa-microchip"></i> AI CORE V3
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
