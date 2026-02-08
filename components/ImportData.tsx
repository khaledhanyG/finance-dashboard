import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { AppState, ExpenseEntry } from '../types';

interface ImportDataProps {
  state: AppState;
  onImport: (entries: ExpenseEntry[]) => Promise<void>;
}

type Step = 'upload' | 'column-map' | 'value-map' | 'preview';

interface RawRow {
  [key: string]: any;
}

interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  category: string;
  employee: string;
  department: string;
}

interface ValueMapping {
  categories: Record<string, string>; // rawValue -> catId
  employees: Record<string, string>;  // rawValue -> empId
  departments: Record<string, string>; // rawValue -> deptId
}

export const ImportData: React.FC<ImportDataProps> = ({ state, onImport }) => {
  const [step, setStep] = useState<Step>('upload');
  const [rawData, setRawData] = useState<RawRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState<ColumnMapping>({
    date: '', amount: '', description: '', category: '', employee: '', department: ''
  });
  const [valMap, setValMap] = useState<ValueMapping>({
    categories: {}, employees: {}, departments: {}
  });
  const [previewData, setPreviewData] = useState<ExpenseEntry[]>([]);
  const [importing, setImporting] = useState(false);

  // Helper: Extract unique values for a column
  const getUniqueValues = (colName: string): string[] => {
    if (!colName) return [];
    return Array.from(new Set(rawData.map(r => String(r[colName] || '').trim()).filter(Boolean)));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' });
      
      if (data.length > 0) {
        setHeaders(Object.keys(data[0]));
        setRawData(data);
        setStep('column-map');
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapColumns = () => {
    const map = { ...colMap };
    headers.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('date')) map.date = h;
      else if (lower.includes('amount') || lower.includes('cost') || lower.includes('total')) map.amount = h;
      else if (lower.includes('desc') || lower.includes('detail') || lower.includes('narrat')) map.description = h;
      else if (lower.includes('cat') || lower.includes('account')) map.category = h;
      else if (lower.includes('emp') || lower.includes('staff') || lower.includes('contact')) map.employee = h;
      else if (lower.includes('dept') || lower.includes('cost center')) map.department = h;
    });
    setColMap(map);
  };

  // Run auto-map once headers are set
  React.useEffect(() => {
    if (step === 'column-map' && headers.length > 0) {
      autoMapColumns();
    }
  }, [step, headers]);

  const generatePreview = () => {
    // Basic validation
    if (!colMap.date || !colMap.amount || !colMap.category) {
      alert("Please map at least Date, Amount, and Category columns.");
      return;
    }

    const preview: ExpenseEntry[] = rawData.map((row, idx) => {
      // Map Values
      const rawCat = String(row[colMap.category] || '').trim();
      const rawEmp = String(row[colMap.employee] || '').trim();
      const rawDept = String(row[colMap.department] || '').trim();

      const catId = valMap.categories[rawCat] || state.expenseCategories[0]?.id || ''; 
      const empId = valMap.employees[rawEmp] || 'SHARED';
      let deptId = valMap.departments[rawDept] || '';

      // Logic: 
      // 1. If SHARED, Department should be empty (distributed later).
      // 2. If Specific Employee, use THEIR Department (override any mapping).
      // 3. If neither, fallback to mapped department or default.

      if (empId === 'SHARED') {
          deptId = ''; 
      } else if (empId) {
          const emp = state.employees.find(e => e.id === empId);
          if (emp) deptId = emp.departmentId;
      }

      // If still no department and not shared, fallback to first department (only if needed)
      if (!deptId && empId !== 'SHARED' && state.departments.length > 0) {
          deptId = state.departments[0].id;
      }
      
      // Parse Date
      let dateStr = new Date().toISOString().split('T')[0];
      const rowDate = row[colMap.date];
      if (rowDate instanceof Date) {
        dateStr = rowDate.toISOString().split('T')[0];
      } else if (typeof rowDate === 'string' || typeof rowDate === 'number') {
        const d = new Date(rowDate);
        if (!isNaN(d.getTime())) dateStr = d.toISOString().split('T')[0];
      }

      return {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `import-${Date.now()}-${idx}-${Math.random().toString(36).substr(2,9)}`,
        date: dateStr,
        amount: Number(row[colMap.amount]) || 0,
        amountPaid: Number(row[colMap.amount]) || 0, // Assume fully paid for now, or add column mapping
        remainingAmount: 0,
        description: String(row[colMap.description] || 'Imported Expense'),
        categoryId: catId,
        departmentId: deptId,
        employeeId: empId === 'SHARED' ? null : empId,
        journalNo: `IMP-${Math.floor(Math.random() * 10000)}`,
        fileAttachments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isShared: empId === 'SHARED'
      };
    }).filter(e => e.amount > 0); // Skip empty or zero rows

    setPreviewData(preview);
    setStep('preview');
  };

  const executeImport = async () => {
    if (confirm(`Ready to import ${previewData.length} records? This cannot be undone.`)) {
      setImporting(true);
      // Pass full object including ID (backend expects client-generated ID)
      const toImport = previewData.map(item => ({ ...item } as ExpenseEntry));
      await onImport(toImport);
      setImporting(false);
      alert('Import Successful!');
      setStep('upload');
      setRawData([]);
      setPreviewData([]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-50">
        <div className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center">
            <i className="fas fa-file-import text-xl"></i>
        </div>
        <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Qoyod Bulk Import Wizard</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Import expenses from Excel/CSV</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
            {['upload', 'column-map', 'value-map', 'preview'].map((s, idx) => (
                <div key={s} className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${step === s ? 'bg-emerald-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">{idx + 1}</span>
                    {s.replace('-', ' ')}
                </div>
            ))}
        </div>
      </div>

      {step === 'upload' && (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center hover:border-emerald-400 transition-colors bg-slate-50/50">
          <i className="fas fa-cloud-upload-alt text-4xl text-emerald-300 mb-4"></i>
          <h3 className="text-lg font-bold text-slate-600 mb-2">Drag & Drop your Qoyod File here</h3>
          <p className="text-xs text-slate-400 mb-6">Supports .xlsx, .xls, .csv</p>
          <input type="file" onChange={handleFileUpload} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs cursor-pointer hover:bg-emerald-700 transition-transform active:scale-95 shadow-lg shadow-emerald-100">
            Browse Files
          </label>
        </div>
      )}

      {step === 'column-map' && (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(Object.keys(colMap) as Array<keyof ColumnMapping>).map(key => (
                    <div key={key}>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">{key} Column</label>
                        <select 
                            value={colMap[key]} 
                            onChange={e => setColMap(prev => ({...prev, [key]: e.target.value}))}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                        >
                            <option value="">-- Select Column --</option>
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                    </div>
                ))}
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                <button onClick={() => setStep('upload')} className="text-slate-400 font-bold uppercase text-xs px-4">Back</button>
                <button onClick={() => setStep('value-map')} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100">Next: Map Values</button>
            </div>
        </div>
      )}

      {step === 'value-map' && (
        <div className="space-y-8 animate-fadeIn">
            {/* Categories */}
            <div>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Map Categories</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getUniqueValues(colMap.category).map(val => (
                        <div key={val} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 w-1/3 truncate" title={val}>{val}</span>
                            <i className="fas fa-arrow-right text-slate-300 text-xs"></i>
                            <select 
                                className="flex-1 text-xs p-2 rounded border border-slate-200 bg-white"
                                value={valMap.categories[val] || ''}
                                onChange={e => setValMap(prev => ({...prev, categories: {...prev.categories, [val]: e.target.value}}))}
                            >
                                <option value="">Select FinPulse Category...</option>
                                {state.expenseGroups.map(g => (
                                    <optgroup key={g.id} label={g.name}>
                                        {state.expenseCategories.filter(c => c.groupId === g.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            {/* Employees */}
            <div>
                <h4 className="text-sm font-black text-slate-700 uppercase tracking-wide mb-4 border-b border-slate-100 pb-2">Map Employees</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {getUniqueValues(colMap.employee).map(val => (
                        <div key={val} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <span className="text-xs font-bold text-slate-500 w-1/3 truncate" title={val}>{val}</span>
                            <i className="fas fa-arrow-right text-slate-300 text-xs"></i>
                            <select 
                                className="flex-1 text-xs p-2 rounded border border-slate-200 bg-white"
                                value={valMap.employees[val] || ''}
                                onChange={e => setValMap(prev => ({...prev, employees: {...prev.employees, [val]: e.target.value}}))}
                            >
                                <option value="">Select FinPulse Employee...</option>
                                <option value="SHARED">★ SHARED (All Active Staff)</option>
                                {state.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                            </select>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                <button onClick={() => setStep('column-map')} className="text-slate-400 font-bold uppercase text-xs px-4">Back</button>
                <button onClick={generatePreview} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-indigo-700 shadow-lg shadow-indigo-100">Next: Preview Data</button>
            </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6 animate-fadeIn">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
                <div>
                   <h3 className="text-indigo-900 font-bold text-sm">Ready to Import</h3>
                   <p className="text-indigo-600 text-xs">{previewData.length} records processed and mapped.</p>
                </div>
                <button onClick={executeImport} disabled={importing} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 disabled:opacity-50">
                    {importing ? 'Importing...' : 'Confirm & Import All'}
                </button>
            </div>

            <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 border-b border-slate-100 font-black text-slate-500 uppercase sticky top-0">
                        <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Description</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3">Category (Mapped)</th>
                            <th className="px-4 py-3">Employee (Mapped)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {previewData.slice(0, 100).map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-mono text-slate-600">{row.date}</td>
                                <td className="px-4 py-2 text-slate-700 truncate max-w-[200px]">{row.description}</td>
                                <td className="px-4 py-2 text-right font-mono font-bold text-slate-800">{row.amount.toLocaleString()}</td>
                                <td className="px-4 py-2">
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold ${row.categoryId ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {state.expenseCategories.find(c => c.id === row.categoryId)?.name || 'MISSING'}
                                    </span>
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        value={row.isShared ? 'SHARED' : (row.employeeId || '')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setPreviewData(prev => prev.map((item, i) => {
                                                if (i !== idx) return item;
                                                if (val === 'SHARED') return { ...item, isShared: true, employeeId: null, departmentId: '' };
                                                
                                                // Find employee department
                                                let newDeptId = item.departmentId;
                                                if (val) {
                                                    const emp = state.employees.find(emp => emp.id === val);
                                                    if (emp) newDeptId = emp.departmentId;
                                                }
                                                return { ...item, isShared: false, employeeId: val || null, departmentId: newDeptId };
                                            }));
                                        }}
                                        className={`w-full text-[10px] font-bold uppercase rounded py-1 px-2 border-none outline-none cursor-pointer ${
                                            row.isShared ? 'bg-indigo-100 text-indigo-700' : 
                                            row.employeeId ? 'bg-slate-100 text-slate-700' : 'bg-rose-50 text-rose-400'
                                        }`}
                                    >
                                        <option value="">-- Unassigned --</option>
                                        <option value="SHARED">★ SHARED (All Active Staff)</option>
                                        <optgroup label="Employees">
                                            {state.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </optgroup>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {previewData.length > 100 && <p className="text-center py-2 text-xs text-slate-400 italic">Showing first 100 of {previewData.length} records...</p>}
            </div>

            <div className="flex justify-end pt-4">
                <button onClick={() => setStep('value-map')} className="text-slate-400 font-bold uppercase text-xs px-4">Back to Mapping</button>
            </div>
        </div>
      )}
    </div>
  );
};
