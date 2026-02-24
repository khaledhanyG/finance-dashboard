import React, { useState, useMemo } from 'react';
import { AppState, Bank, CashFlowItem, ExpenseCategory } from '../types';

const maxDate = '2026-12-31';

const CashFlowForecast: React.FC<{ state: AppState; onUpdate: (s: Partial<AppState>) => void; onDelete?: (name: string, onConfirm: () => void) => void }> = ({ state, onUpdate }) => {
  const banks: Bank[] = state.banks || [];
  const items: CashFlowItem[] = state.cashFlowForecast || [];

  const categories: ExpenseCategory[] = state.expenseCategories || [];

  const [form, setForm] = useState({ bankId: banks[0]?.id || '', date: '', amount: '', type: 'expense', description: '', categoryId: categories[0]?.id || '', recurring: false });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankEditValue, setBankEditValue] = useState<string>('0');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankId || !form.date || !form.amount) return;
    if (form.date > maxDate) { alert('Date must be on or before 2026-12-31'); return; }
    const created: CashFlowItem[] = [];
    const baseDate = new Date(form.date);
    const end = new Date(2026, 11, 31);

    if (form.recurring) {
      // create one per month from selected month until Dec 2026
      const year = baseDate.getFullYear();
      let month = baseDate.getMonth();
      let cur = new Date(year, month, baseDate.getDate());
      while (cur <= end) {
        created.push({ id: `cf-${Date.now()}-${created.length}`, bankId: form.bankId, date: cur.toISOString().slice(0,10), amount: Number(form.amount), type: form.type as 'expense'|'inflow', description: form.description, categoryId: form.categoryId || undefined });
        month++;
        cur = new Date(cur.getFullYear(), month, baseDate.getDate());
      }
    } else {
      created.push({ id: `cf-${Date.now()}`, bankId: form.bankId, date: form.date, amount: Number(form.amount), type: form.type as 'expense'|'inflow', description: form.description, categoryId: form.categoryId || undefined });
    }

    onUpdate({ cashFlowForecast: [...items, ...created] });
    setForm({ ...form, amount: '', description: '' });
  };

  const handleDelete = (id: string) => {
    onUpdate({ cashFlowForecast: items.filter(i => i.id !== id) });
  };

  const handleBankSave = (bank: Bank) => {
    const newBanks = (banks || []).map(b => b.id === bank.id ? bank : b);
    onUpdate({ banks: newBanks });
    setEditingBankId(null);
  };

  const months = useMemo(() => {
    const out: { key: string; label: string; year: number; month: number }[] = [];
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(2026, 11, 31);
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      out.push({ key: `${cur.getFullYear()}-${cur.getMonth() + 1}`, label: cur.toLocaleString(undefined, { month: 'short', year: 'numeric' }), year: cur.getFullYear(), month: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    return out;
  }, [state]);

  const gridTotals = useMemo(() => {
    // map categoryId -> monthKey -> sum
    const map: Record<string, Record<string, number>> = {};
    items.forEach(it => {
      if (!it.categoryId || it.type !== 'expense') return;
      const d = new Date(it.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      map[it.categoryId] = map[it.categoryId] || {};
      map[it.categoryId][key] = (map[it.categoryId][key] || 0) + it.amount;
    });
    return map;
  }, [items]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h4 className="text-xl font-bold text-slate-800 mb-4">Cash Flow Forecast</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h5 className="text-sm font-bold text-slate-600 mb-2">Banks</h5>
          <ul className="space-y-3">
            {banks.map(b => (
              <li key={b.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{b.name}</div>
                  <div className="text-xs text-slate-500">Balance: <span className="font-bold text-indigo-600">{b.balance.toLocaleString()}</span></div>
                </div>
                <div className="flex items-center gap-2">
                  {editingBankId === b.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={bankEditValue} onChange={e => setBankEditValue(e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" />
                      <button onClick={() => handleBankSave({ ...b, balance: Number(bankEditValue || 0) })} className="bg-emerald-600 text-white px-3 py-1 rounded">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingBankId(b.id); setBankEditValue(String(b.balance || 0)); }} className="text-slate-400 hover:text-indigo-600 p-2"><i className="fas fa-pen"></i></button>
                  )}
                </div>
              </li>
            ))}
            {banks.length === 0 && <li className="text-slate-400 italic">No banks configured. Add banks in Organization &gt; Configuration.</li>}
          </ul>
        </div>

        <div className="md:col-span-2">
          <form onSubmit={handleAdd} className="flex gap-2 items-end mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Bank</label>
              <select className="w-full border rounded px-2 py-2" value={form.bankId} onChange={e => setForm({ ...form, bankId: e.target.value })}>
                <option value="">Select Bank</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="w-56">
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Category</label>
              <select className="w-full border rounded px-2 py-2" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">-- none --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Date</label>
              <input type="date" max={maxDate} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="border rounded px-2 py-2" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="border rounded px-2 py-2 w-36" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="border rounded px-2 py-2 w-36">
                <option value="expense">Expense</option>
                <option value="inflow">Inflow</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 uppercase font-bold mb-1">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-2 py-2" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs"><input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} className="mr-2" />Recurring monthly</label>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Add</button>
            </div>
          </form>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-3">Category / Expense</th>
                  {months.map(m => (
                    <th key={m.key} className="px-3 py-2 text-center">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    {months.map(m => {
                      const v = (gridTotals[cat.id] && gridTotals[cat.id][m.key]) || 0;
                      return <td key={m.key} className="px-3 py-2 text-right">{v ? v.toLocaleString() : '-'}</td>;
                    })}
                  </tr>
                ))}

                {categories.length === 0 && <tr><td colSpan={months.length + 1} className="p-8 text-center text-slate-400 italic">No categories configured. Add categories in Settings.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowForecast;
