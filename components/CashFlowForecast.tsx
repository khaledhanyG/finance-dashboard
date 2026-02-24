import React, { useState } from 'react';
import { AppState, Bank, CashFlowItem } from '../types';

const maxDate = '2026-12-31';

const CashFlowForecast: React.FC<{ state: AppState; onUpdate: (s: Partial<AppState>) => void; onDelete?: (name: string, onConfirm: () => void) => void }> = ({ state, onUpdate }) => {
  const banks: Bank[] = state.banks || [];
  const items: CashFlowItem[] = state.cashFlowForecast || [];

  const [form, setForm] = useState({ bankId: banks[0]?.id || '', date: '', amount: '', type: 'expense', description: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankId || !form.date || !form.amount) return;
    if (form.date > maxDate) { alert('Date must be on or before 2026-12-31'); return; }
    const newItem: CashFlowItem = {
      id: `cf-${Date.now()}`,
      bankId: form.bankId,
      date: form.date,
      amount: Number(form.amount),
      type: form.type as 'expense' | 'inflow',
      description: form.description
    };
    onUpdate({ cashFlowForecast: [...items, newItem] });
    setForm({ ...form, amount: '', description: '' });
  };

  const handleDelete = (id: string) => {
    onUpdate({ cashFlowForecast: items.filter(i => i.id !== id) });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h4 className="text-xl font-bold text-slate-800 mb-4">Cash Flow Forecast</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <h5 className="text-sm font-bold text-slate-600 mb-2">Banks</h5>
          <ul className="space-y-2">
            {banks.map(b => (
              <li key={b.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                <div className="font-semibold text-slate-800">{b.name}</div>
                <div className="text-xs text-slate-500">Balance: <span className="font-bold text-indigo-600">{b.balance.toLocaleString()}</span></div>
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
            <div>
              <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Add</button>
            </div>
          </form>

          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Bank</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(it => (
                  <tr key={it.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">{it.date}</td>
                    <td className="px-4 py-3">{banks.find(b => b.id === it.bankId)?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{it.type}</td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-600">{it.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">{it.description}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(it.id)} className="text-rose-400 hover:text-rose-600 p-2"><i className="fas fa-trash"></i></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">No forecast items yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashFlowForecast;
