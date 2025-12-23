
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { AppState } from '../types';
import { getFinancialInsights } from '../services/geminiService';

export const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const metrics = useMemo(() => {
    const totalIncome = state.incomeEntries.reduce((sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)), 0);
    const operationalExpenses = state.expenseEntries.reduce((sum, e) => sum + e.amount, 0);
    const salaryExpenses = state.employees.filter(emp => emp.isActive).reduce((sum, emp) => sum + emp.salary, 0);
    const incomeCOGS = state.incomeEntries.reduce((sum, i) => sum + (i.cogs - (i.totalInspectorShareCancelled || 0)), 0);
    
    const totalExpenses = operationalExpenses + salaryExpenses + incomeCOGS;
    const cogsValue = state.expenseEntries
      .filter(e => state.expenseCategories.find(c => c.id === e.categoryId && state.expenseGroups.find(g => g.id === c.groupId)?.isCOGS))
      .reduce((sum, e) => sum + e.amount, 0) + incomeCOGS;

    return { 
      totalIncome, 
      totalExpenses, 
      cogsValue, 
      grossProfit: totalIncome - cogsValue, 
      netProfit: totalIncome - totalExpenses, 
      totalPayable: state.outstandingExpenses.reduce((sum, o) => sum + o.amount, 0) 
    };
  }, [state]);

  const deptAnalysis = useMemo(() => {
    if (state.departments.length === 0) return [];
    return state.departments.map(d => {
      const expenses = state.expenseEntries
        .filter(e => e.departmentId === d.id)
        .reduce((sum, e) => sum + e.amount, 0) +
        state.employees.filter(emp => emp.departmentId === d.id && emp.isActive).reduce((sum, emp) => sum + emp.salary, 0);
      
      const income = state.incomeEntries
        .filter(i => i.departmentId === d.id)
        .reduce((sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)), 0);

      return {
        name: d.name,
        Income: income,
        Expenses: expenses,
        Profit: income - expenses
      };
    });
  }, [state]);

  const handleGenerateAI = async () => {
    if (state.expenseEntries.length === 0 && state.incomeEntries.length === 0) return;
    setLoadingAi(true);
    const insights = await getFinancialInsights(state);
    setAiInsights(insights);
    setLoadingAi(false);
  };

  if (state.departments.length === 0 && state.expenseEntries.length === 0 && state.incomeEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="bg-indigo-100 p-6 rounded-full"><i className="fas fa-chart-line text-4xl text-indigo-500"></i></div>
        <h2 className="text-xl font-bold text-slate-800">No data available yet</h2>
        <p className="text-slate-500 max-w-xs">Start by adding Departments and Accounting entries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financial Insights</h2>
          <p className="text-slate-500 text-sm">Real-time departmental performance monitoring.</p>
        </div>
        <button onClick={handleGenerateAI} disabled={loadingAi} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50">
          <i className={`fas ${loadingAi ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i> AI Insights
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Revenue (Net)', value: metrics.totalIncome, color: 'text-emerald-600' },
          { label: 'Op. Cost (Net)', value: metrics.totalExpenses, color: 'text-rose-600' },
          { label: 'COGS Total', value: metrics.cogsValue, color: 'text-amber-600' },
          { label: 'Gross Profit', value: metrics.grossProfit, color: 'text-blue-600' },
          { label: 'Net Profit', value: metrics.netProfit, color: metrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600' },
          { label: 'Total Payable', value: metrics.totalPayable, color: 'text-orange-600' },
        ].map((card, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">{card.label}</span>
            <div className="flex items-baseline gap-1"><span className={`text-lg font-black ${card.color}`}>{card.value.toLocaleString()}</span><span className="text-[9px] font-bold text-slate-300">SAR</span></div>
          </div>
        ))}
      </div>

      {aiInsights && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-inner animate-fadeIn">
          <div className="prose prose-sm prose-indigo max-w-none text-indigo-800 italic whitespace-pre-wrap">{aiInsights}</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[450px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase tracking-widest text-xs">Departmental P&L Analysis</h3>
          <ResponsiveContainer width="100%" height="90%">
            <ComposedChart data={deptAnalysis}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} />
              <YAxis tick={{fontSize: 11, fill: '#64748b'}} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="Profit" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
