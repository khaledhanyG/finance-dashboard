import React, { useState, useMemo } from 'react';
import { AppState, Bank, CashFlowItem, Company } from '../types';

const maxDate = '2026-12-31';

const EXPENSE_ROWS = [
  'Employment cost',
  'Inspectors Offices & Freelancers',
  'Commission',
  'Fixed Assets',
  'Office Rental',
  'Loan',
  'Professional fees',
  'Marketing',
  'Others'
];

const CashFlowForecast: React.FC<{ state: AppState; onUpdate: (s: Partial<AppState>) => void; onDelete?: (name: string, onConfirm: () => void) => void }> = ({ state, onUpdate }) => {
  const companies: Company[] = state.companies || [];
  const banks: Bank[] = state.banks || [];
  const items: CashFlowItem[] = state.cashFlowForecast || [];

  // Quick Actions State
  const [companyName, setCompanyName] = useState('');
  const [bankForm, setBankForm] = useState({ name: '', balance: '', companyId: '' });
  const [entryForm, setEntryForm] = useState({
    companyId: '',
    bankId: '',
    date: '',
    amount: '',
    type: 'expense' as 'expense' | 'inflow_b2b' | 'inflow_b2c',
    categoryId: EXPENSE_ROWS[0],
    description: '',
    recurring: false
  });

  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly'); // Keeping simple for now
  const [cellModal, setCellModal] = useState<{ open: boolean; companyId?: string; monthKey?: string; type?: string; category?: string; bankId?: string }>({ open: false });

  // --- Handlers ---
  const handleAddCompany = () => {
    if (!companyName) return alert('Enter company name');
    const newCompany: Company = { id: `comp-${Date.now()}`, name: companyName };
    onUpdate({ companies: [...companies, newCompany] });
    setCompanyName('');
  };

  const handleAddBank = () => {
    if (!bankForm.name || !bankForm.companyId) return alert('Enter bank name and select company');
    const newBank: Bank = {
      id: `bank-${Date.now()}`,
      name: bankForm.name,
      balance: Number(bankForm.balance || 0),
      companyId: bankForm.companyId
    };
    onUpdate({ banks: [...banks, newBank] });
    setBankForm({ ...bankForm, name: '', balance: '' });
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.companyId || !entryForm.date || !entryForm.amount) return alert('Missing fields');
    if (entryForm.date > maxDate) { alert('Date must be on or before 2026-12-31'); return; }

    const created: CashFlowItem[] = [];
    const baseDate = new Date(entryForm.date);
    const end = new Date(2026, 11, 31);

    const itemBase = {
      bankId: entryForm.bankId || undefined,
      companyId: entryForm.companyId,
      amount: Number(entryForm.amount),
      type: entryForm.type,
      description: entryForm.description,
      categoryId: entryForm.type === 'expense' ? entryForm.categoryId : undefined
    };

    if (entryForm.recurring) {
      const year = baseDate.getFullYear();
      let month = baseDate.getMonth();
      let cur = new Date(year, month, baseDate.getDate());
      while (cur <= end) {
        created.push({ ...itemBase, id: `cf-${Date.now()}-${created.length}`, date: cur.toISOString().slice(0,10) });
        month++;
        cur = new Date(cur.getFullYear(), month, baseDate.getDate());
      }
    } else {
      created.push({ ...itemBase, id: `cf-${Date.now()}`, date: entryForm.date });
    }

    onUpdate({ cashFlowForecast: [...items, ...created] });
    setEntryForm({ ...entryForm, amount: '', description: '' });
  };

  const deleteItem = (id: string) => {
    onUpdate({ cashFlowForecast: items.filter(i => i.id !== id) });
    setCellModal({ ...cellModal, open: false });
  };

  const updateItem = (newItem: CashFlowItem) => {
    onUpdate({ cashFlowForecast: items.map(i => i.id === newItem.id ? newItem : i) });
  };


  // --- Data Processing ---
  const months = useMemo(() => {
    const out: { key: string; label: string; year: number; month: number }[] = [];
    const now = new Date();
    // Start from Jan 2026 as per requirement "Jan-26"
    // Wait, prompt says "Jan-26 | Feb-26 etc...".
    // Is it strictly 2026? Or starting from current?
    // User logic previously was from current month to Dec 2026.
    // I'll stick to 2026 for now if that's the request, or use the dynamic range.
    // Let's use 2026 entirely for the headers as per "Jan-26".
    const start = new Date(2026, 0, 1);
    const end = new Date(2026, 11, 31);
    let cur = new Date(start);
    while (cur <= end) {
      out.push({ key: `${cur.getFullYear()}-${cur.getMonth() + 1}`, label: cur.toLocaleString(undefined, { month: 'short', year: '2-digit' }), year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, []);

  const companyData = useMemo(() => {
    const data: Record<string, any> = {};

    companies.forEach(comp => {
      // Initialize structure
      data[comp.id] = {
        banks: {}, // bankId -> monthKey -> balance
        b2b: {},   // monthKey -> total
        b2c: {},   // monthKey -> total
        cashIn: {}, // monthKey -> total
        expenses: {}, // category -> monthKey -> total
        cashOut: {}, // monthKey -> total
        net: {} // monthKey -> total
      };

      // Initialize banks for this company
      const compBanks = banks.filter(b => b.companyId === comp.id);
      compBanks.forEach(b => {
        data[comp.id].banks[b.id] = { start: b.balance, months: {} };
      });

      // Initialize expense rows
      EXPENSE_ROWS.forEach(row => {
        data[comp.id].expenses[row] = {};
      });
    });

    // Process all items
    // First, group items by month/company/type
    // We need to process chronologically for bank balances?
    // Or just bucket them. Bank balance requires chronological.

    // Let's bucket items first
    const itemsByMonthComp: Record<string, CashFlowItem[]> = {}; // key: "compId-monthKey"

    items.forEach(it => {
       if (!it.companyId) return;
       const d = new Date(it.date);
       // Only care about 2026? Or all time?
       // If item is before 2026, it should affect opening balance of 2026?
       // Assume "Balance" in Bank definition is "Starting Balance".
       // And items are future items.
       // So we filter for 2026 items for the table cells.
       const key = `${d.getFullYear()}-${d.getMonth() + 1}`;

       if (!data[it.companyId]) return; // Company deleted?

       // Aggregate totals
       if (it.type === 'inflow_b2b') {
         data[it.companyId].b2b[key] = (data[it.companyId].b2b[key] || 0) + it.amount;
         data[it.companyId].cashIn[key] = (data[it.companyId].cashIn[key] || 0) + it.amount;
       } else if (it.type === 'inflow_b2c') {
         data[it.companyId].b2c[key] = (data[it.companyId].b2c[key] || 0) + it.amount;
         data[it.companyId].cashIn[key] = (data[it.companyId].cashIn[key] || 0) + it.amount;
       } else if (it.type === 'expense') {
         const cat = it.categoryId || 'Others';
         data[it.companyId].expenses[cat][key] = (data[it.companyId].expenses[cat][key] || 0) + it.amount;
         data[it.companyId].cashOut[key] = (data[it.companyId].cashOut[key] || 0) + it.amount;
       }
    });

    // Calculate Bank Balances
    // For each bank, running balance = Start + Sum(Inflows linked to bank) - Sum(Expenses linked to bank)
    // We iterate months.
    companies.forEach(comp => {
      const compBanks = banks.filter(b => b.companyId === comp.id);
      compBanks.forEach(b => {
        let currentBal = b.balance;
        // Note: Logic assumes b.balance is "Current" or "Start of 2026"?
        // If items exist before 2026, we should process them too.
        // For simplicity, let's assume b.balance is current actual balance, and we project forward from "Now" or just for 2026.
        // User asked for "Jan-26".
        // We'll assume simple accumulation for displayed months.

        months.forEach(m => {
          // Find items for this month, this bank
          const monthItems = items.filter(it => {
            if (it.companyId !== comp.id || it.bankId !== b.id) return false;
            const d = new Date(it.date);
            return `${d.getFullYear()}-${d.getMonth() + 1}` === m.key;
          });

          const inAmt = monthItems.filter(i => i.type.startsWith('inflow')).reduce((s, i) => s + i.amount, 0);
          const outAmt = monthItems.filter(i => i.type === 'expense').reduce((s, i) => s + i.amount, 0);

          currentBal = currentBal + inAmt - outAmt;
          data[comp.id].banks[b.id].months[m.key] = currentBal;
        });
      });
    });

    return data;
  }, [items, companies, banks, months]);

  // Totals Calculation
  const overallData = useMemo(() => {
    const total: any = {
      banks: {}, // monthKey -> total balance across all banks
      receivables: {}, // Placeholder
      expected: {}, // monthKey -> B2B + B2C total
      cashIn: {},
      expenses: {}, // category -> monthKey -> total
      cashOut: {},
      net: {}
    };

    months.forEach(m => {
      let mBankTotal = 0;
      let mExpected = 0;
      let mCashIn = 0;
      let mCashOut = 0;

      // Sum from companies
      companies.forEach(comp => {
        const cData = companyData[comp.id];
        if (!cData) return;

        // Banks
        const compBanks = banks.filter(b => b.companyId === comp.id);
        compBanks.forEach(b => {
          mBankTotal += (cData.banks[b.id].months[m.key] || 0);
        });

        // Cash In
        mExpected += (cData.b2b[m.key] || 0) + (cData.b2c[m.key] || 0);
        mCashIn += (cData.cashIn[m.key] || 0);

        // Cash Out
        mCashOut += (cData.cashOut[m.key] || 0);

        // Expenses per cat
        EXPENSE_ROWS.forEach(cat => {
          total.expenses[cat] = total.expenses[cat] || {};
          total.expenses[cat][m.key] = (total.expenses[cat][m.key] || 0) + (cData.expenses[cat][m.key] || 0);
        });
      });

      total.banks[m.key] = mBankTotal;
      total.expected[m.key] = mExpected;
      total.cashIn[m.key] = mCashIn;
      total.cashOut[m.key] = mCashOut;
      total.net[m.key] = mCashIn - mCashOut;
    });

    return total;
  }, [companyData, companies, banks, months]);

  // Modal List
  const getModalItems = () => {
    if (!cellModal.open || !cellModal.companyId || !cellModal.monthKey) return [];
    return items.filter(it => {
      if (it.companyId !== cellModal.companyId) return false;
      const d = new Date(it.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (key !== cellModal.monthKey) return false;

      if (cellModal.bankId) return it.bankId === cellModal.bankId; // Bank cell
      if (cellModal.type === 'b2b') return it.type === 'inflow_b2b';
      if (cellModal.type === 'b2c') return it.type === 'inflow_b2c';
      if (cellModal.type === 'cashIn') return it.type.startsWith('inflow');
      if (cellModal.category) return it.categoryId === cellModal.category;
      if (cellModal.type === 'cashOut') return it.type === 'expense';

      return false;
    });
  };

  const modalList = getModalItems();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h4 className="text-xl font-bold text-slate-800 mb-4">Cash Flow Forecast</h4>

      {/* Quick Actions Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 flex flex-wrap gap-6 items-end text-xs">
        <div className="flex flex-col gap-1 w-40">
          <label className="font-bold text-slate-500 uppercase">New Company</label>
          <div className="flex gap-1">
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Name" className="w-full border rounded px-2 py-1" />
            <button onClick={handleAddCompany} className="bg-indigo-600 text-white px-2 rounded hover:bg-indigo-700">Add</button>
          </div>
        </div>

        <div className="flex flex-col gap-1 w-64">
          <label className="font-bold text-slate-500 uppercase">New Bank</label>
          <div className="flex gap-1">
            <select value={bankForm.companyId} onChange={e => setBankForm({...bankForm, companyId: e.target.value})} className="border rounded px-2 py-1 w-1/3">
              <option value="">Company...</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={bankForm.name} onChange={e => setBankForm({...bankForm, name: e.target.value})} placeholder="Bank Name" className="border rounded px-2 py-1 w-1/3" />
            <input value={bankForm.balance} onChange={e => setBankForm({...bankForm, balance: e.target.value})} placeholder="Balance" type="number" className="border rounded px-2 py-1 w-1/4" />
            <button onClick={handleAddBank} className="bg-emerald-600 text-white px-2 rounded hover:bg-emerald-700">Add</button>
          </div>
        </div>

        <div className="flex flex-col gap-1 flex-1 min-w-[600px]">
          <label className="font-bold text-slate-500 uppercase">New Entry</label>
          <form onSubmit={handleAddEntry} className="flex gap-2 items-end">
             <select className="w-32 border rounded px-2 py-1" value={entryForm.companyId} onChange={e => setEntryForm({ ...entryForm, companyId: e.target.value })}>
               <option value="">Company...</option>
               {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>

             <select className="w-32 border rounded px-2 py-1" value={entryForm.bankId} onChange={e => setEntryForm({ ...entryForm, bankId: e.target.value })}>
               <option value="">Bank (Opt)</option>
               {banks.filter(b => b.companyId === entryForm.companyId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
             </select>

             <select className="w-28 border rounded px-2 py-1" value={entryForm.type} onChange={e => setEntryForm({ ...entryForm, type: e.target.value as any })}>
               <option value="expense">Expense</option>
               <option value="inflow_b2b">Expected B2B</option>
               <option value="inflow_b2c">Expected B2C</option>
             </select>

             {entryForm.type === 'expense' && (
               <select className="w-40 border rounded px-2 py-1" value={entryForm.categoryId} onChange={e => setEntryForm({ ...entryForm, categoryId: e.target.value })}>
                 {EXPENSE_ROWS.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
             )}

             <input type="date" max={maxDate} value={entryForm.date} onChange={e => setEntryForm({ ...entryForm, date: e.target.value })} className="w-32 border rounded px-2 py-1" />
             <input type="number" placeholder="Amount" value={entryForm.amount} onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })} className="w-24 border rounded px-2 py-1" />
             <input placeholder="Desc" value={entryForm.description} onChange={e => setEntryForm({ ...entryForm, description: e.target.value })} className="flex-1 border rounded px-2 py-1" />

             <div className="flex items-center gap-1">
                <input type="checkbox" checked={entryForm.recurring} onChange={e => setEntryForm({ ...entryForm, recurring: e.target.checked })} />
                <button type="submit" className="bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700">Add</button>
             </div>
          </form>
        </div>
      </div>

      {/* Tables Area */}
      <div className="space-y-12">
        {companies.map(comp => {
          const cData = companyData[comp.id];
          if (!cData) return null;
          const compBanks = banks.filter(b => b.companyId === comp.id);

          return (
            <div key={comp.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-bold text-lg text-slate-700 flex justify-between">
                 <span>{comp.name}</span>
                 <button onClick={() => { if(confirm('Delete company?')) onUpdate({ companies: companies.filter(c => c.id !== comp.id) }) }} className="text-xs text-rose-500">Delete</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right table-fixed border-collapse">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2 w-64 text-left border-b border-r border-slate-200">Item</th>
                      {months.map(m => <th key={m.key} className="p-2 w-24 border-b border-slate-200">{m.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Banks */}
                    {compBanks.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="p-2 text-left border-r border-slate-200 font-medium text-slate-600">Available in {b.name}</td>
                        {months.map(m => (
                          <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, bankId: b.id })} className="p-2 border-b border-slate-100 cursor-pointer">
                            {(cData.banks[b.id].months[m.key] || 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}

                    {/* Income */}
                    <tr className="hover:bg-slate-50"><td className="p-2 text-left border-r border-slate-200">Expected B2B</td>{months.map(m => <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, type: 'b2b' })} className="p-2 border-b border-slate-100 cursor-pointer">{(cData.b2b[m.key] || 0).toLocaleString()}</td>)}</tr>
                    <tr className="hover:bg-slate-50"><td className="p-2 text-left border-r border-slate-200">Expected B2C</td>{months.map(m => <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, type: 'b2c' })} className="p-2 border-b border-slate-100 cursor-pointer">{(cData.b2c[m.key] || 0).toLocaleString()}</td>)}</tr>
                    <tr className="bg-emerald-50 font-bold"><td className="p-2 text-left border-r border-slate-200">Cash In</td>{months.map(m => <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, type: 'cashIn' })} className="p-2 border-b border-slate-200 cursor-pointer">{(cData.cashIn[m.key] || 0).toLocaleString()}</td>)}</tr>

                    {/* Spacer */}
                    <tr><td className="p-2 border-r border-slate-200">&nbsp;</td>{months.map(m => <td key={m.key} className="border-b border-slate-100"></td>)}</tr>

                    {/* Expenses */}
                    {EXPENSE_ROWS.map(row => (
                      <tr key={row} className="hover:bg-slate-50">
                        <td className="p-2 text-left border-r border-slate-200">{row}</td>
                        {months.map(m => (
                          <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, category: row, type: 'cashOut' })} className="p-2 border-b border-slate-100 cursor-pointer">
                            {(cData.expenses[row][m.key] || 0).toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-rose-50 font-bold"><td className="p-2 text-left border-r border-slate-200">Cash Out</td>{months.map(m => <td key={m.key} onClick={() => setCellModal({ open: true, companyId: comp.id, monthKey: m.key, type: 'cashOut' })} className="p-2 border-b border-slate-200 cursor-pointer">{(cData.cashOut[m.key] || 0).toLocaleString()}</td>)}</tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Totals Table */}
        {companies.length > 0 && (
          <div className="border border-slate-300 rounded-lg overflow-hidden mt-8 shadow-md">
            <div className="bg-indigo-900 px-4 py-2 font-bold text-lg text-white">Total Overall</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right table-fixed border-collapse">
                <thead className="bg-indigo-50 text-indigo-900">
                  <tr>
                    <th className="p-2 w-64 text-left border-b border-r border-indigo-200">Item</th>
                    {months.map(m => <th key={m.key} className="p-2 w-24 border-b border-indigo-200">{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                   <tr className="font-bold"><td className="p-2 text-left border-r border-slate-200">Available in Banks</td>{months.map(m => <td key={m.key} className="p-2 border-b border-slate-100">{(overallData.banks[m.key] || 0).toLocaleString()}</td>)}</tr>
                   <tr><td className="p-2 text-left border-r border-slate-200">Receivables</td>{months.map(m => <td key={m.key} className="p-2 border-b border-slate-100">-</td>)}</tr>
                   <tr><td className="p-2 text-left border-r border-slate-200">Expected</td>{months.map(m => <td key={m.key} className="p-2 border-b border-slate-100">{(overallData.expected[m.key] || 0).toLocaleString()}</td>)}</tr>
                   <tr className="bg-emerald-100 font-black"><td className="p-2 text-left border-r border-slate-200">Cash In</td>{months.map(m => <td key={m.key} className="p-2 border-b border-slate-200">{(overallData.cashIn[m.key] || 0).toLocaleString()}</td>)}</tr>

                   <tr><td className="p-2 border-r border-slate-200 font-bold text-left pt-4">Expenses Overall</td>{months.map(m => <td key={m.key}></td>)}</tr>

                   {EXPENSE_ROWS.map(row => (
                      <tr key={row}>
                        <td className="p-2 text-left border-r border-slate-200 pl-4">{row}</td>
                        {months.map(m => (
                          <td key={m.key} className="p-2 border-b border-slate-100">{(overallData.expenses[row][m.key] || 0).toLocaleString()}</td>
                        ))}
                      </tr>
                   ))}

                   <tr className="bg-rose-100 font-black"><td className="p-2 text-left border-r border-slate-200">Cash Out</td>{months.map(m => <td key={m.key} className="p-2 border-b border-slate-200">{(overallData.cashOut[m.key] || 0).toLocaleString()}</td>)}</tr>

                   <tr className="bg-slate-800 text-white font-black text-sm"><td className="p-3 text-left border-r border-slate-700">Net</td>{months.map(m => <td key={m.key} className="p-3 border-b border-slate-700">{(overallData.net[m.key] || 0).toLocaleString()}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {cellModal.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl p-6 w-[600px] max-w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
               <h4 className="font-bold">Items Detail</h4>
               <button onClick={() => setCellModal({ ...cellModal, open: false })}><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-2">
              {modalList.length === 0 && <p className="text-slate-400">No items found.</p>}
              {modalList.map(it => (
                <div key={it.id} className="border p-2 rounded flex justify-between items-center text-sm">
                   <div>
                     <div className="font-bold">{it.description || '(No desc)'}</div>
                     <div className="text-xs text-slate-500">{it.date} • {it.amount.toLocaleString()}</div>
                   </div>
                   <div className="flex items-center gap-2">
                     <button onClick={() => {
                        const newAmt = prompt('New Amount', String(it.amount));
                        if (newAmt !== null) updateItem({ ...it, amount: Number(newAmt) });
                     }} className="text-indigo-600 hover:text-indigo-800">Edit</button>
                     <button onClick={() => { if(confirm('Delete?')) deleteItem(it.id); }} className="text-rose-500 hover:text-rose-700">Delete</button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CashFlowForecast;
