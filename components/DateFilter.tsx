import React, { useMemo } from 'react';

export interface DateFilterState {
  year: number | 'all';
  quarter: number | 'all';
  month: number | 'all';
  day: number | 'all';
}

interface DateFilterProps {
  filter: DateFilterState;
  onChange: (filter: DateFilterState) => void;
  availableYears: number[];
}

export const DateFilter: React.FC<DateFilterProps> = ({ filter, onChange, availableYears }) => {
  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const quarters = [
    { value: 1, label: 'Q1' }, { value: 2, label: 'Q2' }, { value: 3, label: 'Q3' }, { value: 4, label: 'Q4' }
  ];

  // Generate days based on month/year if selected, else 1-31
  const days = useMemo(() => {
    let daysInMonth = 31;
    if (filter.month !== 'all' && filter.year !== 'all') {
      daysInMonth = new Date(filter.year, filter.month, 0).getDate();
    }
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [filter.month, filter.year]);

  const handleChange = (key: keyof DateFilterState, value: string) => {
    const numValue = value === 'all' ? 'all' : parseInt(value);
    
    // Reset lower granularity if higher changes
    let newFilter = { ...filter, [key]: numValue };
    
    if (key === 'year') {
        // Keep other filters if possible, but usually safe to reset or keep
    }
    
    onChange(newFilter);
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-4 items-center">
      <div className="flex items-center gap-2">
        <i className="fas fa-filter text-slate-400"></i>
        <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Filters</span>
      </div>
      
      {/* Year */}
      <select 
        className="form-select text-sm border-slate-200 rounded-lg"
        value={filter.year}
        onChange={(e) => handleChange('year', e.target.value)}
      >
        <option value="all">All Years</option>
        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
      </select>

      {/* Quarter */}
      <select 
        className="form-select text-sm border-slate-200 rounded-lg"
        value={filter.quarter}
        onChange={(e) => handleChange('quarter', e.target.value)}
      >
        <option value="all">All Quarters</option>
        {quarters.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
      </select>

      {/* Month */}
      <select 
        className="form-select text-sm border-slate-200 rounded-lg"
        value={filter.month}
        onChange={(e) => handleChange('month', e.target.value)}
      >
        <option value="all">All Months</option>
        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>

      {/* Day */}
      <select 
        className="form-select text-sm border-slate-200 rounded-lg"
        value={filter.day}
        onChange={(e) => handleChange('day', e.target.value)}
      >
        <option value="all">All Days</option>
        {days.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
      
      <button 
        onClick={() => onChange({ year: 'all', quarter: 'all', month: 'all', day: 'all'})}
        className="ml-auto text-xs text-rose-500 hover:text-rose-700 font-medium"
      >
        Reset Filters
      </button>
    </div>
  );
};
