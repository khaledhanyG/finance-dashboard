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

  const [viewMode, setViewMode] = useState<'monthly' | 'daily'>('monthly');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(months[0]?.key || '');

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>('');

  const [cellModal, setCellModal] = useState<{
    open: boolean;
    categoryId?: string;
    monthKey?: string;
    day?: number;
  }>({ open: false });

  const openCellModal = (categoryId: string, monthKey: string, day?: number) => {
    setCellModal({ open: true, categoryId, monthKey, day });
  };

  const closeCellModal = () => setCellModal({ open: false });

  const itemsForCell = (categoryId: string, monthKey: string, day?: number) => {
    return items.filter(it => it.categoryId === categoryId && (() => {
      const d = new Date(it.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (key !== monthKey) return false;
      if (day) return d.getDate() === day;
      return true;
    })());
  };

  const saveCategoryName = (catId: string) => {
    const updated = (state.expenseCategories || []).map(c => c.id === catId ? { ...c, name: editingCategoryName } : c);
    onUpdate({ expenseCategories: updated });
    setEditingCategoryId(null);
  };

  const deleteCategory = (catId: string) => {
    if (!confirm('Delete category and its forecast items?')) return;
    const updatedCats = (state.expenseCategories || []).filter(c => c.id !== catId);
    const updatedItems = (items || []).filter(i => i.categoryId !== catId);
    onUpdate({ expenseCategories: updatedCats, cashFlowForecast: updatedItems });
  };

  const updateForecastItem = (updatedItem: CashFlowItem) => {
    const newItems = items.map(i => i.id === updatedItem.id ? updatedItem : i);
    onUpdate({ cashFlowForecast: newItems });
  };

  const removeForecastItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    onUpdate({ cashFlowForecast: newItems });
  };

  // Modal content renderer
  const CellModalContent: React.FC = () => {
    if (!cellModal.open || !cellModal.categoryId || !cellModal.monthKey) return null;
    const list = itemsForCell(cellModal.categoryId, cellModal.monthKey, cellModal.day);
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-[900px] max-w-full">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold">Items for {state.expenseCategories.find(c=>c.id===cellModal.categoryId)?.name} {cellModal.day ? `(day ${cellModal.day})` : `(${cellModal.monthKey})`}</h4>
            <button onClick={closeCellModal} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times"></i></button>
          </div>
          <div className="space-y-3">
            {list.length === 0 && <div className="text-slate-400 italic">No items</div>}
            {list.map(it => (
              <div key={it.id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-semibold">{it.description || '(no desc)'}</div>
                  <div className="text-xs text-slate-500">{it.date} • {banks.find(b=>b.id===it.bankId)?.name || 'Unknown'} • {it.type} • {it.amount.toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    const edit = { ...it };
                    const newAmount = prompt('Amount', String(edit.amount));
                    if (newAmount === null) return;
                    edit.amount = Number(newAmount);
                    const newDesc = prompt('Description', edit.description || '');
                    if (newDesc === null) return;
                    edit.description = newDesc;
                    updateForecastItem(edit);
                  }} className="text-indigo-600">Edit</button>
                  <button onClick={() => { if (confirm('Delete item?')) removeForecastItem(it.id); }} className="text-rose-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- Sidebar small form components (inline in this file) ---
  const BankForm: React.FC = () => {
    const [name, setName] = useState('');
    const [balance, setBalanceLocal] = useState('0');
    const handleAddBank = () => {
      if (!name) return alert('Enter bank name');
      const newBank: Bank = { id: `bank-${Date.now()}`, name, balance: Number(balance || 0) };
      onUpdate({ banks: [...banks, newBank] });
      setName(''); setBalanceLocal('0');
    };
    return (
      <div className="space-y-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Bank name" className="w-full border rounded px-2 py-1 text-sm" />
        <input value={balance} onChange={e => setBalanceLocal(e.target.value)} placeholder="Balance" type="number" className="w-full border rounded px-2 py-1 text-sm" />
        <button onClick={handleAddBank} className="w-full bg-indigo-600 text-white py-1 rounded text-sm">Add Bank</button>
      </div>
    );
  };

  const GroupForm: React.FC = () => {
    const [gName, setGName] = useState('');
    const [isCOGS, setIsCOGS] = useState(false);
    const handleAddGroup = () => {
      if (!gName) return alert('Enter group name');
      const newG = { id: `grp-${Date.now()}`, name: gName, isCOGS };
      onUpdate({ expenseGroups: [...(state.expenseGroups || []), newG] });
      setGName(''); setIsCOGS(false);
    };
    return (
      <div className="space-y-2">
        <input value={gName} onChange={e => setGName(e.target.value)} placeholder="Group name" className="w-full border rounded px-2 py-1 text-sm" />
        <label className="text-xs"><input type="checkbox" checked={isCOGS} onChange={e => setIsCOGS(e.target.checked)} className="mr-2" />COGS</label>
        <button onClick={handleAddGroup} className="w-full bg-emerald-600 text-white py-1 rounded text-sm">Add Group</button>
      </div>
    );
  };

  const CategoryForm: React.FC = () => {
    const [cName, setCName] = useState('');
    const [groupId, setGroupId] = useState(state.expenseGroups?.[0]?.id || '');
    const handleAddCat = () => {
      if (!cName) return alert('Enter category name');
      const newC = { id: `cat-${Date.now()}`, groupId: groupId || '', name: cName };
      onUpdate({ expenseCategories: [...(state.expenseCategories || []), newC] });
      setCName('');
    };
    return (
      <div className="space-y-2">
        <select value={groupId} onChange={e => setGroupId(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
          <option value="">Select Group</option>
          {(state.expenseGroups || []).map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <input value={cName} onChange={e => setCName(e.target.value)} placeholder="Category name" className="w-full border rounded px-2 py-1 text-sm" />
        <button onClick={handleAddCat} className="w-full bg-amber-600 text-white py-1 rounded text-sm">Add Category</button>
      </div>
    );
  };

  return (
    <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-6">
      <h4 className="text-xl font-bold text-slate-800 mb-4">Cash Flow Forecast</h4>
      <div className="flex flex-col gap-6">
        <div>
          <h5 className="text-sm font-bold text-slate-600 mb-3">Banks</h5>
          <div className="flex flex-wrap gap-3 items-start">
            {banks.length === 0 && <div className="text-slate-400 italic">No banks configured. Add banks in Organization &gt; Configuration.</div>}
            {banks.map(b => (
              <div key={b.id} className="p-2 border border-slate-100 rounded-md bg-slate-50 flex items-center gap-3 w-44 text-sm">
                <div className="flex-1">
                  <div className="font-medium text-slate-800 truncate">{b.name}</div>
                  <div className="text-[11px] text-slate-500">Balance: <span className="font-bold text-indigo-600">{b.balance.toLocaleString()}</span></div>
                </div>
                <div>
                  {editingBankId === b.id ? (
                    <div className="flex items-center gap-2">
                      <input type="number" value={bankEditValue} onChange={e => setBankEditValue(e.target.value)} className="w-20 border rounded px-2 py-1 text-sm" />
                      <button onClick={() => handleBankSave({ ...b, balance: Number(bankEditValue || 0) })} className="bg-emerald-600 text-white px-2 py-1 rounded text-xs">Save</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingBankId(b.id); setBankEditValue(String(b.balance || 0)); }} className="text-slate-400 hover:text-indigo-600 p-1"><i className="fas fa-pen"></i></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
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

          <div className="w-full overflow-x-auto border border-slate-100 rounded-lg">
            <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('monthly')} className={`px-3 py-1 rounded ${viewMode === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>Monthly</button>
                <button onClick={() => setViewMode('daily')} className={`px-3 py-1 rounded ${viewMode === 'daily' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border'}`}>Daily</button>
                {viewMode === 'daily' && (
                  <select value={selectedMonthKey} onChange={e => setSelectedMonthKey(e.target.value)} className="ml-4 border rounded px-2 py-1 text-sm">
                    {months.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                )}
              </div>
              <div className="text-sm text-slate-500">Click a cell to view/edit items</div>
            </div>

            {viewMode === 'monthly' ? (
              <table className="w-full text-left text-sm table-fixed">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="px-4 py-3 w-64">Category / Expense</th>
                    {months.map(m => (
                      <th key={m.key} className="px-3 py-2 text-center">{m.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <tr key={cat.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {editingCategoryId === cat.id ? (
                            <input autoFocus value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} onBlur={() => saveCategoryName(cat.id)} className="border rounded px-2 py-1 text-sm" />
                          ) : (
                            <span onDoubleClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }}>{cat.name}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingCategoryId(cat.id); setEditingCategoryName(cat.name); }} className="text-slate-400 hover:text-indigo-600 p-1"><i className="fas fa-edit"></i></button>
                          <button onClick={() => deleteCategory(cat.id)} className="text-rose-400 hover:text-rose-600 p-1"><i className="fas fa-trash"></i></button>
                        </div>
                      </td>
                      {months.map(m => {
                        const v = (gridTotals[cat.id] && gridTotals[cat.id][m.key]) || 0;
                        return <td key={m.key} onClick={() => openCellModal(cat.id, m.key)} className="px-3 py-2 text-right cursor-pointer hover:bg-slate-50">{v ? v.toLocaleString() : '-'}</td>;
                      })}
                    </tr>
                  ))}

                  {categories.length === 0 && <tr><td colSpan={months.length + 1} className="p-8 text-center text-slate-400 italic">No categories configured. Add categories in Settings.</td></tr>}
                </tbody>
              </table>
            ) : (
              // Daily view for selected month
              (() => {
                const sel = months.find(m => m.key === selectedMonthKey) || months[0];
                const year = sel.year;
                const monthIndex = sel.month; // 0-based
                const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
                const dayKeys = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                return (
                  <table className="w-full text-left text-sm table-fixed">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="px-4 py-3 w-64">Category / Expense</th>
                        {dayKeys.map(d => <th key={d} className="px-2 py-2 text-center">{d}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map(cat => (
                        <tr key={cat.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium">{cat.name}</td>
                          {dayKeys.map(d => {
                            const key = `${year}-${monthIndex + 1}`;
                            const v = itemsForCell(cat.id, key, d).reduce((s, it) => s + it.amount, 0);
                            return <td key={d} onClick={() => openCellModal(cat.id, key, d)} className="px-2 py-2 text-right cursor-pointer hover:bg-slate-50">{v ? v.toLocaleString() : '-'}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* Right-side compact sidebar (absolute) - does not change table size */}
      <div className="absolute right-6 top-8 w-72 bg-white border border-slate-100 rounded-lg shadow-md p-4 z-40">
        <h5 className="text-sm font-bold text-slate-700 mb-3">Quick Actions</h5>

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Add Bank</p>
          <BankForm />
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">Add Expense Group</p>
          <GroupForm />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Add Category</p>
          <CategoryForm />
        </div>
      </div>
    </div>
  );
};

export default CashFlowForecast;
