
import React, { useState, useMemo } from 'react';
import { AppState } from '../types';

export const Reports: React.FC<{ state: AppState }> = ({ state }) => {
  const [reportType, setReportType] = useState<'employees' | 'expenses_by_emp' | 'expenses_by_dept'>('employees');
  const [customFilters, setCustomFilters] = useState({
    startDate: '',
    endDate: '',
    departmentId: '',
    employeeId: ''
  });

  const exportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName])).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const reportData = useMemo(() => {
    switch (reportType) {
      case 'employees':
        return state.employees.map(e => ({
          'ID': e.employeeNumber,
          'Name': e.name,
          'Department': state.departments.find(d => d.id === e.departmentId)?.name || '-',
          'Salary (SAR)': e.salary,
          'Nationality': e.nationality,
          'Status': e.isActive ? 'Active' : 'Inactive'
        }));
      case 'expenses_by_emp':
        return state.expenseEntries
          .filter(e => !customFilters.employeeId || e.employeeId === customFilters.employeeId)
          .map(e => ({
            'Date': e.date,
            'Employee': state.employees.find(emp => emp.id === e.employeeId)?.name || 'Direct',
            'Category': state.expenseCategories.find(c => c.id === e.categoryId)?.name || '-',
            'Amount': e.amount,
            'Paid': e.amountPaid,
            'Journal': e.journalNo
          }));
      case 'expenses_by_dept':
        return state.expenseEntries
          .filter(e => !customFilters.departmentId || e.departmentId === customFilters.departmentId)
          .map(e => ({
            'Date': e.date,
            'Department': state.departments.find(d => d.id === e.departmentId)?.name || '-',
            'Category': state.expenseCategories.find(c => c.id === e.categoryId)?.name || '-',
            'Amount': e.amount,
            'Description': e.description
          }));
      default:
        return [];
    }
  }, [reportType, state, customFilters]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-slate-50 pb-6">
          <div className="flex-1 space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Report Type</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'employees', label: 'Employee Roster', icon: 'fa-users' },
                { id: 'expenses_by_emp', label: 'Expenses by Employee', icon: 'fa-id-card' },
                { id: 'expenses_by_dept', label: 'Expenses by Department', icon: 'fa-sitemap' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    reportType === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="w-full md:w-auto flex items-end">
             <button 
              onClick={() => exportCSV(reportData, `report_${reportType}`)}
              className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
             >
               <i className="fas fa-file-excel"></i> Export CSV
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
           {reportType !== 'employees' && (
             <>
               <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Dept</label>
                  <select 
                    value={customFilters.departmentId} 
                    onChange={e => setCustomFilters({...customFilters, departmentId: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">All Departments</option>
                    {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Employee</label>
                  <select 
                    value={customFilters.employeeId} 
                    onChange={e => setCustomFilters({...customFilters, employeeId: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="">All Employees</option>
                    {state.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
               </div>
             </>
           )}
           <div className="md:col-span-2 text-right self-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total Results: {reportData.length}</span>
           </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-inner bg-slate-50">
           {reportData.length > 0 ? (
             <table className="w-full text-left text-sm">
               <thead className="bg-white border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                 <tr>
                   {Object.keys(reportData[0]).map(h => <th key={h} className="px-6 py-4">{h}</th>)}
                 </tr>
               </thead>
               <tbody>
                 {reportData.map((row, idx) => (
                   <tr key={idx} className="border-b border-slate-50 hover:bg-white transition-colors">
                     {Object.values(row).map((val: any, vIdx) => (
                       <td key={vIdx} className="px-6 py-3 text-slate-600 font-medium">
                          {typeof val === 'number' ? val.toLocaleString() : val}
                       </td>
                     ))}
                   </tr>
                 ))}
               </tbody>
             </table>
           ) : (
             <div className="py-20 text-center text-slate-400 italic">No data matched the selected criteria.</div>
           )}
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white h-10 w-10 rounded-xl flex items-center justify-center">
              <i className="fas fa-print"></i>
            </div>
            <div>
              <h4 className="font-bold text-indigo-900">Printable Layout</h4>
              <p className="text-xs text-indigo-700">Need a paper copy? Use the browser print function (Ctrl + P) for a formatted version.</p>
            </div>
         </div>
         <button onClick={() => window.print()} className="bg-white text-indigo-600 border border-indigo-200 px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
            Open Print
         </button>
      </div>
    </div>
  );
};
