
import React, { useState, useMemo } from 'react';
import { AppState } from '../types';

type ReportType = 'employees' | 'expenses_by_emp' | 'expenses_by_dept' | 'expenses_by_category' | 'income_by_service' | 'service_comparison' | 'cogs_breakdown';

export const Reports: React.FC<{ state: AppState }> = ({ state }) => {
  const [reportType, setReportType] = useState<ReportType>('employees');
  const [customFilters, setCustomFilters] = useState({
    startDate: '',
    endDate: '',
    employeeId: '',
    serviceId: ''
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const exportExcel = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => headers.map(fieldName => {
        let val = row[fieldName];
        if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
        return val;
      }).join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  const exportPDF = () => {
    window.print();
  };

  const reportData = useMemo(() => {
    const isWithinDateRange = (date: string) => {
      if (!customFilters.startDate && !customFilters.endDate) return true;
      if (customFilters.startDate && date < customFilters.startDate) return false;
      if (customFilters.endDate && date > customFilters.endDate) return false;
      return true;
    };

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
        const expandedStaffExpenses = state.expenseEntries
          .filter(e => isWithinDateRange(e.date))
          .flatMap(e => {
            if (e.isShared) {
              const activeEmps = state.employees.filter(emp => {
                const joined = !emp.startDate || emp.startDate <= e.date;
                const left = emp.endDate && emp.endDate < e.date;
                return joined && !left;
              });

              if (activeEmps.length === 0) return []; // Should not happen ideally

              const share = e.amount / activeEmps.length;
              return activeEmps.map(emp => ({
                originalId: e.id,
                date: e.date,
                employeeId: emp.id,
                categoryId: e.categoryId,
                amount: share,
                amountPaid: e.amountPaid / activeEmps.length,
                journalNo: e.journalNo,
                description: `${e.description} (Shared Share)`,
                isShared: true
              }));
            }
            return [{
              originalId: e.id,
              date: e.date,
              employeeId: e.employeeId,
              categoryId: e.categoryId,
              amount: e.amount,
              amountPaid: e.amountPaid,
              journalNo: e.journalNo,
              description: e.description,
              isShared: false
            }];
          });

        return expandedStaffExpenses
          .filter(e => !customFilters.employeeId || e.employeeId === customFilters.employeeId)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(e => {
            const emp = state.employees.find(emp => emp.id === e.employeeId);
            const cat = state.expenseCategories.find(c => c.id === e.categoryId);
            const grp = cat ? state.expenseGroups.find(g => g.id === cat.groupId) : null;
            return {
              'Date': e.date,
              'Employee': emp?.name || (e.isShared ? 'Unknown' : 'Direct'),
              'Department': state.departments.find(d => d.id === emp?.departmentId)?.name || '-',
              'Group': grp?.name || '-',
              'Category': cat?.name || '-',
              'Amount': e.amount,
              'Journal': e.journalNo
            };
          });

      case 'expenses_by_dept':
        const expandedExpenses = state.expenseEntries
          .filter(e => isWithinDateRange(e.date))
          .flatMap(e => {
            if (e.isShared) {
              const activeEmps = state.employees.filter(emp => {
                const joined = !emp.startDate || emp.startDate <= e.date;
                const left = emp.endDate && emp.endDate < e.date;
                return joined && !left;
              });

              if (activeEmps.length === 0) return [{ ...e, departmentId: 'Unallocated', description: `${e.description} (No Active Staff)` }];

              const amountPerEmp = e.amount / activeEmps.length;
              const deptCounts: Record<string, number> = {};
              activeEmps.forEach(emp => {
                deptCounts[emp.departmentId] = (deptCounts[emp.departmentId] || 0) + 1;
              });

              return Object.entries(deptCounts).map(([deptId, count]) => ({
                ...e,
                departmentId: deptId,
                amount: amountPerEmp * count,
                description: `${e.description} (Shared / Active Staff: ${activeEmps.length})`
              }));
            }
            return [e];
          });

        return expandedExpenses
          .filter(e => (!customFilters.departmentId || e.departmentId === customFilters.departmentId))
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(e => {
             const cat = state.expenseCategories.find(c => c.id === e.categoryId);
             const grp = cat ? state.expenseGroups.find(g => g.id === cat.groupId) : null;
             return {
              'Date': e.date,
              'Department': e.departmentId === 'Unallocated' ? 'Unallocated' : (state.departments.find(d => d.id === e.departmentId)?.name || '-'),
              'Group': grp?.name || '-',
              'Category': cat?.name || '-',
              'Amount': e.amount,
              'Description': e.description
            };
          });

      case 'expenses_by_category': {
        const grouped = state.expenseEntries
          .filter(e => isWithinDateRange(e.date))
          .reduce((acc, curr) => {
            const catId = curr.categoryId;
            if (!acc[catId]) {
              acc[catId] = { catId, amount: 0, count: 0 };
            }
            acc[catId].amount += curr.amount;
            acc[catId].count += 1;
            return acc;
          }, {} as any);

        return Object.values(grouped).sort((a: any, b: any) => b.amount - a.amount).map((g: any) => ({
          'Category': state.expenseCategories.find(c => c.id === g.catId)?.name || 'Unknown',
          'Group': state.expenseGroups.find(gr => gr.id === state.expenseCategories.find(c => c.id === g.catId)?.groupId)?.name || '-',
          'Transaction Count': g.count,
          'Total Amount': g.amount
        }));
      }

      case 'cogs_breakdown': {
        const cogsGroups = state.expenseGroups.filter(g => g.isCOGS).map(g => g.id);
        const grouped = state.incomeEntries
          .filter(i => (!customFilters.serviceId || i.serviceId === customFilters.serviceId) && isWithinDateRange(i.date))
          .reduce((acc, curr) => {
            curr.cogsItems?.forEach(item => {
              const key = `${curr.serviceId}_${item.categoryId}`;
              if (!acc[key]) acc[key] = { svcId: curr.serviceId, catId: item.categoryId, amount: 0, count: 0 };
              acc[key].amount += Number(item.amount);
              acc[key].count += 1;
            });
            return acc;
          }, {} as any);

        return Object.values(grouped).sort((a: any, b: any) => {
          // Sort by Service Name first, then by Amount
          const sA = state.incomeServices.find(s => s.id === a.svcId)?.name || '';
          const sB = state.incomeServices.find(s => s.id === b.svcId)?.name || '';
          return sA.localeCompare(sB) || b.amount - a.amount;
        }).map((g: any) => ({
          'Service': state.incomeServices.find(s => s.id === g.svcId)?.name || 'Unknown',
          'COGS Category': state.expenseCategories.find(c => c.id === g.catId)?.name || 'Unknown',
          'Parent Group': state.expenseGroups.find(gr => gr.id === state.expenseCategories.find(c => c.id === g.catId)?.groupId)?.name || '-',
          'Times Applied': g.count,
          'Total Cost (deducted)': g.amount
        }));
      }

      case 'income_by_service': {
        const grouped = state.incomeEntries
          .filter(i => (!customFilters.serviceId || i.serviceId === customFilters.serviceId) && isWithinDateRange(i.date))
          .reduce((acc, curr) => {
            const svcId = curr.serviceId;
            if (!acc[svcId]) {
              acc[svcId] = { svcId, orders: 0, revenue: 0, refunds: 0, cogs: 0, inspectorCr: 0 };
            }
            acc[svcId].orders += Number(curr.ordersCount || 0);
            acc[svcId].revenue += curr.amount;
            acc[svcId].refunds += curr.totalRefundsAmount;
            acc[svcId].cogs += curr.cogs;
            acc[svcId].inspectorCr += curr.totalInspectorShareCancelled;
            return acc;
          }, {} as any);

        return Object.values(grouped).map((g: any) => ({
          'Service': state.incomeServices.find(s => s.id === g.svcId)?.name || 'Unknown',
          'Total Orders': g.orders,
          'Gross Revenue': g.revenue,
          'Total Refunds': g.refunds,
          'Net Revenue': g.revenue - g.refunds,
          'Total COGS': g.cogs,
          'Inspector Credit': g.inspectorCr,
          'Net Profit': (g.revenue - g.refunds) - (g.cogs - g.inspectorCr)
        }));
      }

      case 'service_comparison': {
        const filteredIncomes = state.incomeEntries.filter(i => isWithinDateRange(i.date));
        const totalOverallRevenue = filteredIncomes
          .reduce((sum, i) => sum + (i.amount - i.totalRefundsAmount), 0) || 1;

        const grouped = filteredIncomes
          .reduce((acc, curr) => {
            const svcId = curr.serviceId;
            if (!acc[svcId]) {
              acc[svcId] = { svcId, orders: 0, revenue: 0 };
            }
            acc[svcId].orders += Number(curr.ordersCount || 0);
            acc[svcId].revenue += (curr.amount - curr.totalRefundsAmount);
            return acc;
          }, {} as any);

        return Object.values(grouped).sort((a: any, b: any) => b.revenue - a.revenue).map((g: any) => ({
          'Service': state.incomeServices.find(s => s.id === g.svcId)?.name || 'Unknown',
          'Order Count': g.orders,
          'Net Revenue': g.revenue,
          '% Contribution': ((g.revenue / totalOverallRevenue) * 100).toFixed(2) + '%'
        }));
      }

      default:
        return [];
    }
  }, [reportType, state, customFilters]);

  const reportTitle = useMemo(() => {
    switch (reportType) {
      case 'employees': return 'Employee Directory';
      case 'expenses_by_emp': return 'Expenses by Staff Member';
      case 'expenses_by_dept': return 'Departmental Expenditure';
      case 'expenses_by_category': return 'Expenses by Category';
      case 'cogs_breakdown': return 'COGS Breakdown (Deductions from Income)';
      case 'income_by_service': return 'Income Breakdown by Service';
      case 'service_comparison': return 'Service Market Share Comparison';
      default: return 'Financial Report';
    }
  }, [reportType]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 no-print report-container">
        <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-slate-50 pb-6">
          <div className="flex-1 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Select Report Module</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'employees', label: 'Employees', icon: 'fa-users' },
                { id: 'expenses_by_emp', label: 'Exp by Staff', icon: 'fa-id-card' },
                { id: 'expenses_by_dept', label: 'Exp by Dept', icon: 'fa-sitemap' },
                { id: 'expenses_by_category', label: 'Exp by Cat', icon: 'fa-tags' },
                { id: 'cogs_breakdown', label: 'COGS Report', icon: 'fa-list-ol' },
                { id: 'income_by_service', label: 'Income by Svc', icon: 'fa-box-open' },
                { id: 'service_comparison', label: 'Svc Comparison', icon: 'fa-chart-pie' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setReportType(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportType === tab.id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105' : 'bg-slate-50 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  <i className={`fas ${tab.icon}`}></i>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-auto flex items-end gap-2">
            <button
              onClick={() => exportExcel(reportData, `report_${reportType}`)}
              className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-50 active:scale-95"
            >
              <i className="fas fa-file-excel"></i> Excel
            </button>
            <button
              onClick={exportPDF}
              className="bg-rose-600 text-white px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-50 active:scale-95"
            >
              <i className="fas fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="md:col-span-2 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Start Date</label>
              <input
                type="date"
                value={customFilters.startDate}
                onChange={e => setCustomFilters({ ...customFilters, startDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">End Date</label>
              <input
                type="date"
                value={customFilters.endDate}
                onChange={e => setCustomFilters({ ...customFilters, endDate: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          {reportType === 'expenses_by_dept' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Filter Dept</label>
              <select
                value={customFilters.departmentId}
                onChange={e => setCustomFilters({ ...customFilters, departmentId: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All Departments</option>
                {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {reportType === 'expenses_by_emp' && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Filter Staff</label>
              <select
                value={customFilters.employeeId}
                onChange={e => setCustomFilters({ ...customFilters, employeeId: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All Employees</option>
                {state.employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
          )}

          {reportType === 'income_by_service' || reportType === 'cogs_breakdown' ? (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Filter Service</label>
              <select
                value={customFilters.serviceId}
                onChange={e => setCustomFilters({ ...customFilters, serviceId: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All Services</option>
                {state.incomeServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          ) : null}

          <div className="md:col-span-1 text-right flex items-end justify-end pb-2">
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">Entries Found: {reportData.length}</span>
          </div>
        </div>
      </div>

      {/* Actual Data Table - Visible in UI and Print */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden report-container p-6 md:p-10">
        <div className="mb-6 hidden print:block">
          <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tighter">{reportTitle}</h2>
          <p className="text-xs text-slate-500 font-medium">Generated on {new Date().toLocaleString()}</p>
          {customFilters.startDate && customFilters.endDate && (
            <p className="text-[10px] font-bold text-indigo-600 uppercase mt-2">Period: {customFilters.startDate} to {customFilters.endDate}</p>
          )}
          <hr className="my-4 border-slate-200" />
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          {(reportType === 'expenses_by_emp' || reportType === 'expenses_by_dept') && (
            <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight mb-4 flex items-center gap-3">
              <i className="fas fa-list text-indigo-500"></i>
              Detailed Expenses
            </h3>
          )}
          {reportData.length > 0 ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                <tr>
                  {Object.keys(reportData[0]).map(h => (
                    <th key={h} className={`px-6 py-4 ${h.includes('Revenue') || h.includes('Amount') || h.includes('Profit') || h.includes('COGS') || h.includes('Orders') || h.includes('Count') || h.includes('Refunds') || h.includes('Credit') ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                    {Object.keys(row).map((key, vIdx) => {
                      const val = (row as any)[key];
                      const isNumeric = typeof val === 'number';
                      const isProfit = key.includes('Profit');
                      const isRefund = key.includes('Refunds');
                      const isCogs = key.includes('COGS');
                      return (
                        <td key={vIdx} className={`px-6 py-3.5 text-slate-600 font-medium ${isNumeric ? 'text-right font-mono' : ''}`}>
                          {isNumeric ? (
                            <span className={`
                                ${isProfit ? (val >= 0 ? 'text-emerald-600 font-black' : 'text-rose-600 font-black') : ''}
                                ${isRefund ? 'text-rose-500' : ''}
                                ${isCogs ? 'text-amber-600' : ''}
                              `}>
                              {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          ) : val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-24 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-folder-open text-slate-300 text-2xl"></i>
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No matching records</p>
              <p className="text-[10px] text-slate-300 mt-2 uppercase">Adjust filters to broaden search</p>
            </div>
          )}

          {/* Secondary Grouped Summary Table */}
          {(reportType === 'expenses_by_emp' || reportType === 'expenses_by_dept') && reportData.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-100">
               <h3 className="text-lg font-black text-slate-700 uppercase tracking-tight mb-6 flex items-center gap-3">
                 <i className="fas fa-layer-group text-indigo-500"></i>
                 Grouped Summary
               </h3>
               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
               <table className="w-full text-left text-sm whitespace-nowrap bg-white">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    <tr>
                      <th className="px-6 py-4 w-12"></th>
                      <th className="px-6 py-4">Expense Group</th>
                      <th className="px-6 py-4 text-right">Total (SAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(() => {
                      // Aggregate Data
                      const groups: Record<string, { total: number, items: any[] }> = {};
                      reportData.forEach((row: any) => {
                         const groupName = row['Group'] || 'Unallocated';
                         if (!groups[groupName]) groups[groupName] = { total: 0, items: [] };
                         groups[groupName].total += Number(row['Amount'] || 0);
                         groups[groupName].items.push(row);
                      });

                      const sortedGroups = Object.entries(groups).sort(([, a], [, b]) => b.total - a.total);
                      const grandTotal = sortedGroups.reduce((acc, [, data]) => acc + data.total, 0);

                      return (
                        <React.Fragment>
                          {sortedGroups.map(([groupName, data], idx) => {
                           const isExpanded = expandedRows.has(groupName); 
                           return (
                             <React.Fragment key={idx}>
                               <tr onClick={() => toggleRow(groupName)} className="hover:bg-indigo-50/50 cursor-pointer transition-colors border-b border-slate-50 group">
                                 <td className="px-6 py-4 text-center text-slate-400">
                                   <i className={`fas ${isExpanded ? 'fa-chevron-down text-indigo-500' : 'fa-chevron-right'} transition-transform duration-200`}></i>
                                 </td>
                                 <td className="px-6 py-4 font-black text-slate-700 uppercase tracking-tight">{groupName}</td>
                                 <td className="px-6 py-4 text-right font-black text-slate-800">{data.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                               </tr>
                               {isExpanded && data.items.map((item, iIdx) => (
                                 <tr key={iIdx} className="bg-slate-50/50 hover:bg-slate-50 border-b border-slate-50 animate-fadeIn">
                                   <td className="px-6 py-3"></td>
                                   <td className="px-6 py-3 pl-12 text-xs font-medium text-slate-500">
                                      <div className="flex items-center gap-4">
                                        <span className="font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-200">{item['Date']}</span>
                                        <span className="text-slate-600 font-bold">{item['Category']}</span>
                                      </div>
                                   </td>
                                   <td className="px-6 py-3 text-right text-xs font-mono font-bold text-slate-600">
                                     {typeof item['Amount'] === 'number' ? item['Amount'].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item['Amount']}
                                   </td>
                                 </tr>
                               ))}
                             </React.Fragment>
                           );
                        })}
                        <tr className="bg-slate-100 border-t-2 border-slate-200">
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 font-black text-slate-800 uppercase tracking-widest text-right">Grand Total</td>
                          <td className="px-6 py-4 text-right font-black text-indigo-900 text-lg">{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        </React.Fragment>
                      );
                    })()}
                  </tbody>
               </table>
               </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-100 p-8 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-6">
          <div className="bg-indigo-900 text-white h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100">
            <i className="fas fa-print text-xl"></i>
          </div>
          <div>
            <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg">Presentation Mode</h4>
            <p className="text-xs text-slate-500 font-medium">Generate a clean, professional PDF document of the current filtered dataset.</p>
          </div>
        </div>
        <button onClick={exportPDF} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-lg active:scale-95">
          Initialize PDF Print
        </button>
      </div>
    </div>
  );
};
