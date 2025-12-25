
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, ExpenseEntry, IncomeEntry, OutstandingExpense, Employee, IncomeCogsItem, IncomeRefundItem } from '../types';

interface TransactionsProps {
  state: AppState;
  onAddExpense: (entry: ExpenseEntry) => void;
  onAddExpenses: (entries: ExpenseEntry[]) => void;
  onUpdateExpense: (entry: ExpenseEntry) => void;
  onAddIncome: (entry: IncomeEntry) => void;
  onUpdateIncome: (entry: IncomeEntry) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  onAddOutstanding: (entry: OutstandingExpense) => void;
  onSettleOutstanding: (id: string, amount: number) => void;
}

export const Transactions: React.FC<TransactionsProps> = ({
  state, onAddExpense, onAddExpenses, onUpdateExpense, onAddIncome, onUpdateIncome,
  onDeleteExpense, onDeleteIncome, onAddOutstanding, onSettleOutstanding
}) => {
  const [mode, setMode] = useState<'expense' | 'income' | 'outstanding'>('expense');
  const [incomeType, setIncomeType] = useState<'revenue' | 'refund'>('revenue');
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingIncId, setEditingIncId] = useState<string | null>(null);
  const [divideAmongAll, setDivideAmongAll] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [incomeStartDate, setIncomeStartDate] = useState<string>('');
  const [incomeEndDate, setIncomeEndDate] = useState<string>('');

  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);
  const empDropdownRef = useRef<HTMLDivElement>(null);

  const [settleItemId, setSettleItemId] = useState<string | null>(null);
  const [settleForm, setSettleForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: ''
  });

  const [expForm, setExpForm] = useState({
    date: new Date().toISOString().split('T')[0],
    journalNo: '',
    categoryId: '',
    departmentId: '',
    employeeId: '',
    amount: '',
    amountPaid: '',
    description: ''
  });

  const [incForm, setIncForm] = useState({
    date: new Date().toISOString().split('T')[0],
    ordersCount: '',
    serviceId: '',
    amount: '',
    description: '',
    refundAmount: '',
    inspectorCredit: ''
  });

  const [incCogsItems, setIncCogsItems] = useState<IncomeCogsItem[]>([]);
  const [incRefundItems, setIncRefundItems] = useState<IncomeRefundItem[]>([]);

  const cogsGroups = useMemo(() => {
    return state.expenseGroups.filter(g => g.isCOGS);
  }, [state.expenseGroups]);

  const cogsCategories = useMemo(() => {
    const groupIds = cogsGroups.map(g => g.id);
    return state.expenseCategories.filter(c => groupIds.includes(c.groupId));
  }, [state.expenseCategories, cogsGroups]);

  const totalCogs = useMemo(() => incCogsItems.reduce((sum, item) => sum + Number(item.amount || 0), 0), [incCogsItems]);
  const totalRefundsAmount = useMemo(() => incRefundItems.reduce((sum, item) => sum + Number(item.amountRefunded || 0), 0), [incRefundItems]);
  const totalInspectorShareCancelled = useMemo(() => incRefundItems.reduce((sum, item) => sum + Number(item.inspectorShareCancelled || 0), 0), [incRefundItems]);
  const totalRefundOrdersCount = useMemo(() => incRefundItems.reduce((sum, item) => sum + Number(item.ordersCount || 0), 0), [incRefundItems]);

  const addCogsItem = () => setIncCogsItems([...incCogsItems, { id: `ci-${Date.now()}`, categoryId: '', amount: 0 }]);
  const removeCogsItem = (id: string) => setIncCogsItems(incCogsItems.filter(i => i.id !== id));
  const updateCogsItem = (id: string, field: keyof IncomeCogsItem, value: any) => setIncCogsItems(incCogsItems.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addRefundItem = () => setIncRefundItems([...incRefundItems, { id: `ri-${Date.now()}`, ordersCount: 0, amountRefunded: 0, inspectorShareCancelled: 0 }]);
  const removeRefundItem = (id: string) => setIncRefundItems(incRefundItems.filter(i => i.id !== id));
  const updateRefundItem = (id: string, field: keyof IncomeRefundItem, value: any) => setIncRefundItems(incRefundItems.map(i => i.id === id ? { ...i, [field]: value } : i));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (empDropdownRef.current && !empDropdownRef.current.contains(event.target as Node)) setShowEmpDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectEmployee = (emp: Employee) => {
    setExpForm(prev => ({ ...prev, employeeId: emp.id, departmentId: emp.departmentId }));
    setEmpSearchQuery(emp.name);
    setShowEmpDropdown(false);
  };

  const startEditIncome = (income: IncomeEntry) => {
    setMode('income');
    setEditingIncId(income.id);
    setIncomeType(income.type || 'revenue');
    setIncForm({
      date: income.date,
      ordersCount: income.type === 'refund' ? Math.abs(Number(income.ordersCount)).toString() : (income.grossOrdersCount || income.ordersCount),
      serviceId: income.serviceId,
      amount: income.amount.toString(),
      description: income.description,
      refundAmount: income.totalRefundsAmount.toString(),
      inspectorCredit: income.totalInspectorShareCancelled.toString()
    });
    setIncCogsItems(income.cogsItems || []);
    setIncRefundItems(income.refunds || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditIncome = () => {
    setEditingIncId(null);
    setIncomeType('revenue');
    setIncForm({ date: new Date().toISOString().split('T')[0], ordersCount: '', serviceId: '', amount: '', description: '', refundAmount: '', inspectorCredit: '' });
    setIncCogsItems([]);
    setIncRefundItems([]);
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = Number(expForm.amount);
    const paid = Number(expForm.amountPaid || 0);
    const remaining = Math.max(0, totalAmount - paid);

    if (!expForm.categoryId || !expForm.amount) return;

    if (divideAmongAll) {
      const activeEmployees = state.employees.filter(emp => emp.isActive);
      if (activeEmployees.length === 0) return alert("No active employees found.");
      const splitAmount = totalAmount / activeEmployees.length;
      const splitPaid = paid / activeEmployees.length;
      const newEntries: ExpenseEntry[] = activeEmployees.map((emp, idx) => ({
        id: `e-${Date.now()}-${idx}`,
        date: expForm.date,
        journalNo: expForm.journalNo || `J${Math.floor(Math.random() * 1000)}`,
        categoryId: expForm.categoryId,
        departmentId: emp.departmentId,
        employeeId: emp.id,
        amount: splitAmount,
        amountPaid: splitPaid,
        remainingAmount: splitAmount - splitPaid,
        description: `${expForm.description} (Shared)`
      }));
      onAddExpenses(newEntries);
    } else {
      if (!expForm.departmentId) return;
      const entryId = `e-${Date.now()}`;
      onAddExpense({
        id: entryId,
        date: expForm.date,
        journalNo: expForm.journalNo || `J${Math.floor(Math.random() * 1000)}`,
        categoryId: expForm.categoryId,
        departmentId: expForm.departmentId,
        employeeId: expForm.employeeId || null,
        amount: totalAmount,
        amountPaid: paid,
        remainingAmount: remaining,
        description: expForm.description
      });
      if (remaining > 0) onAddOutstanding({ id: `out-${Date.now()}`, expenseId: entryId, date: expForm.date, amount: remaining, departmentId: expForm.departmentId, description: `Balance for: ${expForm.description}` });
    }
    setExpForm({ ...expForm, amount: '', amountPaid: '', description: '', journalNo: '', employeeId: '' });
    setEmpSearchQuery('');
    setDivideAmongAll(false);
  };

  const handleSubmitIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incForm.serviceId) return;

    let incomeData: IncomeEntry;
    if (incomeType === 'revenue') {
      const gross = Number(incForm.ordersCount || 0);
      incomeData = {
        id: editingIncId || `i-${Date.now()}`,
        date: incForm.date,
        type: 'revenue',
        serviceId: incForm.serviceId,
        ordersCount: String(gross - totalRefundOrdersCount),
        grossOrdersCount: String(gross),
        amount: Number(incForm.amount || 0),
        cogs: totalCogs,
        cogsItems: incCogsItems,
        refunds: incRefundItems,
        totalRefundsAmount,
        totalInspectorShareCancelled,
        description: incForm.description
      };
    } else {
      const refundOrders = Number(incForm.ordersCount || 0);
      incomeData = {
        id: editingIncId || `i-${Date.now()}`,
        date: incForm.date,
        type: 'refund',
        serviceId: incForm.serviceId,
        ordersCount: String(-refundOrders),
        amount: 0,
        cogs: 0,
        cogsItems: [],
        refunds: [],
        totalRefundsAmount: Number(incForm.refundAmount || 0),
        totalInspectorShareCancelled: Number(incForm.inspectorCredit || 0),
        description: incForm.description || `Refund Entry`
      };
    }

    if (editingIncId) onUpdateIncome(incomeData); else onAddIncome(incomeData);
    cancelEditIncome();
  };

  const filteredExpenses = useMemo(() => {
    const s = expenseSearch.toLowerCase();
    return state.expenseEntries.slice().reverse().filter(e =>
      e.journalNo.toLowerCase().includes(s) ||
      state.departments.find(d => d.id === e.departmentId)?.name.toLowerCase().includes(s) ||
      state.expenseCategories.find(c => c.id === e.categoryId)?.name.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s)
    );
  }, [state.expenseEntries, state.departments, state.expenseCategories, expenseSearch]);

  const filteredIncomes = useMemo(() => {
    let list = [...state.incomeEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (incomeStartDate) list = list.filter(i => i.date >= incomeStartDate);
    if (incomeEndDate) list = list.filter(i => i.date <= incomeEndDate);
    return list;
  }, [state.incomeEntries, incomeStartDate, incomeEndDate]);

  const incomeSummary = useMemo(() => filteredIncomes.reduce((acc, curr) => {
    const netRev = curr.amount - (curr.totalRefundsAmount || 0);
    const netCogs = curr.cogs - (curr.totalInspectorShareCancelled || 0);

    // Accumulate each COGS category
    curr.cogsItems?.forEach(item => {
      if (!acc.cogsBreakdown[item.categoryId]) acc.cogsBreakdown[item.categoryId] = 0;
      acc.cogsBreakdown[item.categoryId] += Number(item.amount);
    });

    return {
      orders: acc.orders + Number(curr.ordersCount || 0),
      revenue: acc.revenue + netRev,
      cogs: acc.cogs + netCogs,
      inspectorCr: acc.inspectorCr + (Number(curr.totalInspectorShareCancelled) || 0),
      net: acc.net + (netRev - netCogs),
      cogsBreakdown: acc.cogsBreakdown
    };
  }, { orders: 0, revenue: 0, cogs: 0, inspectorCr: 0, net: 0, cogsBreakdown: {} as Record<string, number> }), [filteredIncomes]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn pb-12">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden sticky top-24">
          <div className="flex border-b border-slate-100">
            {(['expense', 'income', 'outstanding'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-widest transition-all ${mode === m ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>
                {m}
              </button>
            ))}
          </div>
          <div className="p-6">
            {mode === 'expense' ? (
              <form onSubmit={handleSubmitExpense} className="space-y-4">
                <input type="date" value={expForm.date} onChange={e => setExpForm({ ...expForm, date: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" required />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="Journal #" value={expForm.journalNo} onChange={e => setExpForm({ ...expForm, journalNo: e.target.value })} className="border rounded-lg px-3 py-2 text-xs" />
                  <input type="number" placeholder="Cost (SAR)" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: e.target.value })} className="border rounded-lg px-3 py-2 text-xs" required />
                </div>
                <input type="number" placeholder="Paid Now (SAR)" value={expForm.amountPaid} onChange={e => setExpForm({ ...expForm, amountPaid: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" />
                <label className="flex items-center gap-2 p-2 bg-slate-50 rounded border text-[10px] font-bold uppercase cursor-pointer">
                  <input type="checkbox" checked={divideAmongAll} onChange={e => setDivideAmongAll(e.target.checked)} className="rounded text-indigo-600" /> Divide among active staff
                </label>
                {!divideAmongAll && (
                  <div className="relative" ref={empDropdownRef}>
                    <input type="text" placeholder="Search Employee..." value={empSearchQuery} onFocus={() => setShowEmpDropdown(true)} onChange={e => { setEmpSearchQuery(e.target.value); setShowEmpDropdown(true); }} className="w-full border rounded-lg px-3 py-2 text-xs" />
                    {showEmpDropdown && (
                      <div className="absolute z-50 left-0 right-0 mt-1 bg-white border rounded shadow-xl max-h-40 overflow-auto">
                        {state.employees.filter(e => e.name.toLowerCase().includes(empSearchQuery.toLowerCase())).map(e => (
                          <div key={e.id} onClick={() => selectEmployee(e)} className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-xs">{e.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <select value={expForm.categoryId} onChange={e => setExpForm({ ...expForm, categoryId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" required>
                  <option value="">Category</option>
                  {state.expenseGroups.map(g => (
                    <optgroup key={g.id} label={g.name}>
                      {state.expenseCategories.filter(c => c.groupId === g.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                {!divideAmongAll && (
                  <select value={expForm.departmentId} onChange={e => setExpForm({ ...expForm, departmentId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" required>
                    <option value="">Department</option>
                    {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                )}
                <textarea placeholder="Description" value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" rows={2}></textarea>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100">Post Expense</button>
              </form>
            ) : mode === 'income' ? (
              <form onSubmit={handleSubmitIncome} className="space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  {(['revenue', 'refund'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setIncomeType(t)} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${incomeType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={incForm.date} onChange={e => setIncForm({ ...incForm, date: e.target.value })} className="border rounded-lg px-3 py-2 text-xs" required />
                  <input type="number" placeholder={incomeType === 'revenue' ? 'Orders (Gross)' : 'Orders Refunded'} value={incForm.ordersCount} onChange={e => setIncForm({ ...incForm, ordersCount: e.target.value })} className="border rounded-lg px-3 py-2 text-xs" required />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <select value={incForm.serviceId} onChange={e => setIncForm({ ...incForm, serviceId: e.target.value })} className="border rounded-lg px-3 py-2 text-xs" required>
                    <option value="">Service</option>
                    {state.incomeServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {incomeType === 'revenue' ? (
                  <>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <label className="block text-[9px] font-bold text-emerald-800 uppercase mb-1">Revenue Amount (SAR)</label>
                      <input type="number" value={incForm.amount} onChange={e => setIncForm({ ...incForm, amount: e.target.value })} className="w-full border-none bg-transparent outline-none text-xs" required />
                    </div>
                    <div className="space-y-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-rose-800 uppercase">COGS</label><button type="button" onClick={addCogsItem} className="text-[9px] font-black uppercase text-rose-600 underline">Add</button></div>
                      {incCogsItems.map(item => (
                        <div key={item.id} className="flex gap-2 bg-white/50 p-1.5 rounded border border-rose-100">
                          <select value={item.categoryId} onChange={e => updateCogsItem(item.id, 'categoryId', e.target.value)} className="flex-1 bg-transparent text-[10px] outline-none">
                            <option value="">Select COGS</option>
                            {cogsGroups.map(g => (
                              <optgroup key={g.id} label={g.name}>
                                {state.expenseCategories.filter(c => c.groupId === g.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </optgroup>
                            ))}
                          </select>
                          <input type="number" placeholder="Amt" value={item.amount || ''} onChange={e => updateCogsItem(item.id, 'amount', e.target.value)} className="w-16 bg-transparent text-[10px] outline-none font-bold" />
                          <button type="button" onClick={() => removeCogsItem(item.id)} className="text-rose-400"><i className="fas fa-times text-[10px]"></i></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <label className="block text-[9px] font-bold text-rose-800 uppercase mb-1">Refund Amount</label>
                      <input type="number" value={incForm.refundAmount} onChange={e => setIncForm({ ...incForm, refundAmount: e.target.value })} className="w-full border-none bg-transparent outline-none text-xs" required />
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                      <label className="block text-[9px] font-bold text-emerald-800 uppercase mb-1">Inspector Cr.</label>
                      <input type="number" value={incForm.inspectorCredit} onChange={e => setIncForm({ ...incForm, inspectorCredit: e.target.value })} className="w-full border-none bg-transparent outline-none text-xs" required />
                    </div>
                  </div>
                )}
                <textarea placeholder="Description" value={incForm.description} onChange={e => setIncForm({ ...incForm, description: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-xs" rows={2}></textarea>
                <button type="submit" className={`w-full text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-widest shadow-lg ${incomeType === 'revenue' ? 'bg-emerald-600 shadow-emerald-50' : 'bg-amber-600 shadow-amber-50'}`}>
                  {editingIncId ? 'Update Entry' : 'Post Entry'}
                </button>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400 italic text-xs">Access payables via the table view on the right.</div>
            )}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">{mode === 'income' ? 'Income Registry' : mode === 'expense' ? 'Expense Journal' : 'Outstanding Balances'}</h3>
            {mode === 'income' ? (
              <div className="flex gap-2">
                <input type="date" value={incomeStartDate} onChange={e => setIncomeStartDate(e.target.value)} className="text-[10px] px-2 py-1 bg-white border rounded outline-none" placeholder="Start Date" />
                <span className="text-slate-400 self-center">-</span>
                <input type="date" value={incomeEndDate} onChange={e => setIncomeEndDate(e.target.value)} className="text-[10px] px-2 py-1 bg-white border rounded outline-none" placeholder="End Date" />
              </div>
            ) : (
              <input type="text" placeholder="Search..." value={expenseSearch} onChange={e => setExpenseSearch(e.target.value)} className="text-[10px] px-2 py-1 bg-white border rounded outline-none w-32" />
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/50 border-b text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {mode === 'income' ? (
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Orders</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3 text-right">Rev. (Net)</th>
                    {cogsCategories.map(c => <th key={c.id} className="px-4 py-3 text-right text-rose-300 text-[9px]">{c.name}</th>)}
                    <th className="px-4 py-3 text-right text-emerald-300">Insp. Cr.</th>
                    <th className="px-4 py-3 text-right">Net</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                ) : mode === 'expense' ? (
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Journal</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Dept</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3"></th></tr>
                ) : (
                  <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Dept</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-center">Action</th></tr>
                )}
              </thead>
              <tbody>
                {mode === 'income' && filteredIncomes.map(i => {
                  const isRef = i.type === 'refund';
                  const netRev = i.amount - (i.totalRefundsAmount || 0);
                  const netCogs = i.cogs - (i.totalInspectorShareCancelled || 0);
                  return (
                    <tr key={i.id} className={`border-b hover:bg-slate-50 transition-colors ${isRef ? 'bg-amber-50/20' : ''}`}>
                      <td className="px-4 py-3 text-xs text-slate-500">{i.date}</td>
                      <td className={`px-4 py-3 text-xs font-bold ${Number(i.ordersCount) < 0 ? 'text-rose-500' : 'text-indigo-600'}`}>{i.ordersCount}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold text-slate-800">{state.incomeServices.find(s => s.id === i.serviceId)?.name}</div>
                        {isRef && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black uppercase">Refund Entry</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`text-xs font-black ${isRef ? 'text-rose-600' : 'text-emerald-700'}`}>{isRef ? `-${i.totalRefundsAmount.toLocaleString()}` : netRev.toLocaleString()}</div>
                      </td>

                      {/* Dynamic COGS Columns */}
                      {cogsCategories.map(cat => {
                        const item = i.cogsItems?.find(ci => ci.categoryId === cat.id);
                        const amt = item ? Number(item.amount) : 0;
                        return (
                          <td key={cat.id} className="px-4 py-3 text-right">
                            {amt > 0 ? <span className="text-xs font-bold text-rose-500">-{amt.toLocaleString()}</span> : <span className="text-[10px] text-slate-200">-</span>}
                          </td>
                        );
                      })}

                      {/* Inspector Credit / Share Cancelled */}
                      <td className="px-4 py-3 text-right">
                        <div className={`text-xs font-bold ${i.totalInspectorShareCancelled > 0 ? 'text-emerald-500' : 'text-slate-200'}`}>
                          {i.totalInspectorShareCancelled > 0 ? `+${i.totalInspectorShareCancelled.toLocaleString()}` : '-'}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-black">{(netRev - netCogs).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => startEditIncome(i)} className="text-slate-300 hover:text-indigo-600 mr-3"><i className="fas fa-edit"></i></button>
                        <button onClick={() => onDeleteIncome(i.id)} className="text-slate-300 hover:text-rose-600"><i className="fas fa-trash-can"></i></button>
                      </td>
                    </tr>
                  );
                })}
                {mode === 'expense' && filteredExpenses.map(e => (
                  <tr key={e.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{e.date}</td>
                    <td className="px-4 py-3 font-mono text-[10px] font-bold">{e.journalNo}</td>
                    <td className="px-4 py-3 text-xs font-bold">{state.expenseCategories.find(c => c.id === e.categoryId)?.name}</td>
                    <td className="px-4 py-3 text-xs font-bold text-indigo-400 uppercase">{state.departments.find(d => d.id === e.departmentId)?.name}</td>
                    <td className="px-4 py-3 text-right font-black">{e.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => onDeleteExpense(e.id)} className="text-slate-300 hover:text-rose-600"><i className="fas fa-trash-can"></i></button></td>
                  </tr>
                ))}
                {mode === 'outstanding' && state.outstandingExpenses.map(o => (
                  <tr key={o.id} className="border-b hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{o.date}</td>
                    <td className="px-4 py-3 text-xs font-bold">{o.description}</td>
                    <td className="px-4 py-3 text-[10px] font-black uppercase text-indigo-400">{state.departments.find(d => d.id === o.departmentId)?.name}</td>
                    <td className="px-4 py-3 text-right font-black text-rose-600">{o.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center"><button onClick={() => { setSettleItemId(o.id); setSettleForm({ ...settleForm, amount: o.amount.toString() }); }} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-100">PAY</button></td>
                  </tr>
                ))}
              </tbody>
              {mode === 'income' && filteredIncomes.length > 0 && (
                <tfoot className="bg-slate-50 font-black border-t-2">
                  <tr className="text-slate-800">
                    <td className="px-4 py-4 text-[10px] text-slate-400 uppercase tracking-widest">Totals</td>
                    <td className={`px-4 py-4 text-xs ${incomeSummary.orders < 0 ? 'text-rose-600' : 'text-indigo-600'}`}>{incomeSummary.orders}</td>
                    <td className="px-4 py-4"></td>
                    <td className="px-4 py-4 text-right text-xs text-emerald-700">{incomeSummary.revenue.toLocaleString()}</td>
                    {cogsCategories.map(c => (
                      <td key={c.id} className="px-4 py-4 text-right text-[10px] text-rose-400 font-bold">-{incomeSummary.cogsBreakdown[c.id]?.toLocaleString() || 0}</td>
                    ))}
                    <td className="px-4 py-4 text-right text-xs text-emerald-600">+{incomeSummary.inspectorCr.toLocaleString()}</td>
                    <td className="px-4 py-4 text-right text-sm underline decoration-indigo-200 decoration-2 underline-offset-4">{incomeSummary.net.toLocaleString()} SAR</td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {settleItemId && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-tighter">Settle Balance</h3>
            <form onSubmit={(e) => { e.preventDefault(); onSettleOutstanding(settleItemId, Number(settleForm.amount)); setSettleItemId(null); }} className="space-y-4">
              <input type="date" value={settleForm.date} onChange={e => setSettleForm({ ...settleForm, date: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm" required />
              <input type="number" placeholder="Amt Paid" value={settleForm.amount} onChange={e => setSettleForm({ ...settleForm, amount: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm" required />
              <div className="flex gap-2">
                <button type="button" onClick={() => setSettleItemId(null)} className="flex-1 py-2 text-xs font-bold text-slate-400">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase">Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
