import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell,
  LabelList,
} from "recharts";
import { AppState } from "../types";
import { getFinancialInsights } from "../services/geminiService";
import { DateFilter, DateFilterState } from "./DateFilter";

export const Dashboard: React.FC<{ state: AppState }> = ({ state }) => {
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterState>({
    year: new Date().getFullYear(),
    quarter: "all",
    month: "all",
    day: "all",
  });

  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareFilter, setCompareFilter] = useState<DateFilterState>({
    year: new Date().getFullYear() - 1, // Default to previous year
    quarter: "all",
    month: "all",
    day: "all",
  });

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Initialize selected services
  useEffect(() => {
    if (state.incomeServices.length > 0 && selectedServiceIds.length === 0) {
      setSelectedServiceIds(state.incomeServices.map((s) => s.id));
    }
  }, [state.incomeServices]);

  // Helper to format currency
  const formatCurrency = (val: number) =>
    val.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Helper to filter entries by date
  const isDateInRange = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    if (dateFilter.year !== "all" && year !== dateFilter.year) return false;

    if (dateFilter.quarter !== "all") {
      const q = Math.ceil(month / 3);
      if (q !== dateFilter.quarter) return false;
    }

    if (dateFilter.month !== "all" && month !== dateFilter.month) return false;
    if (dateFilter.day !== "all" && day !== dateFilter.day) return false;

    return true;
  };

  const filteredData = useMemo(() => {
    return {
      incomeEntries: state.incomeEntries.filter((i) => isDateInRange(i.date)),
      expenseEntries: state.expenseEntries.filter((e) => isDateInRange(e.date)),
      employees: state.employees, // Employees usually don't have a date field like entries, assume active
    };
  }, [state, dateFilter]);

  const metrics = useMemo(() => {
    const { incomeEntries, expenseEntries } = filteredData;

    // Revenue (Net): from income
    const totalIncome = incomeEntries.reduce(
      (sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)),
      0,
    );

    // OP.COST (Net): from Expenses Entry only
    const operationalExpenses = expenseEntries.reduce(
      (sum, e) => sum + e.amount,
      0,
    );

    const incomeCOGS = incomeEntries.reduce(
      (sum, i) => sum + (i.cogs - (i.totalInspectorShareCancelled || 0)),
      0,
    );

    // COGS derived from Expenses marked as COGS + Income COGS
    const cogsValue =
      expenseEntries
        .filter((e) =>
          state.expenseCategories.find(
            (c) =>
              c.id === e.categoryId &&
              state.expenseGroups.find((g) => g.id === c.groupId)?.isCOGS,
          ),
        )
        .reduce((sum, e) => sum + e.amount, 0) + incomeCOGS;

    // Note: Net Profit logic might need to align with "Total Payable" or other requirements,
    // but typically Net Profit = Revenue - All Expenses (Op + COGS + Salaries).
    // The user ONLY specified Revenue and Op Cost sources.
    // We will keep standard Net Profit calc but ensure Op Cost and Revenue display strictly as asked.

    const salaryExpenses = state.employees
      .filter((emp) => emp.isActive)
      .reduce((sum, emp) => sum + emp.salary, 0);
    const totalExpenses = operationalExpenses + salaryExpenses + incomeCOGS; // For Net Profit calc

    const grossProfit = totalIncome - cogsValue;

    return {
      totalIncome,
      operationalExpenses, // Displayed as OP. COST (Net)
      cogsValue,
      grossProfit,
      netProfit: grossProfit - operationalExpenses,
      totalPayable: state.outstandingExpenses.reduce(
        (sum, o) => sum + o.amount,
        0,
      ),
    };
  }, [filteredData, state]);

  // Chart 1: Income, COGS, % Contribution
  const incomeAnalysis = useMemo(() => {
    const { incomeEntries } = filteredData;
    const services = state.incomeServices;
    const totalIncome = metrics.totalIncome || 1; // Avoid divide by zero

    return services
      .map((service) => {
        const serviceEntries = incomeEntries.filter(
          (i) => i.serviceId === service.id,
        );

        const income = serviceEntries.reduce(
          (sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)),
          0,
        );
        const cogs = serviceEntries.reduce(
          (sum, i) => sum + (i.cogs - (i.totalInspectorShareCancelled || 0)),
          0,
        );
        const grossProfit = income - cogs;

        const contribution = (income / totalIncome) * 100;

        return {
          name: service.name,
          Income: income,
          COGS: cogs,
          GrossProfit: grossProfit,
          Contribution: parseFloat(contribution.toFixed(2)),
        };
      })
      .sort((a, b) => b.Income - a.Income);
  }, [filteredData, state.incomeServices, metrics.totalIncome]);

  // Chart 2: Orders, % Share (Margin from total orders)
  const orderAnalysis = useMemo(() => {
    const { incomeEntries } = filteredData;
    const services = state.incomeServices;

    const totalOrders =
      incomeEntries.reduce(
        (sum, i) => sum + (parseInt(i.ordersCount || "0") || 0),
        0,
      ) || 1;

    return services
      .map((service) => {
        const serviceEntries = incomeEntries.filter(
          (i) => i.serviceId === service.id,
        );

        const orders = serviceEntries.reduce(
          (sum, i) => sum + (parseInt(i.ordersCount || "0") || 0),
          0,
        );
        const share = (orders / totalOrders) * 100;

        return {
          name: service.name,
          Orders: orders,
          Share: parseFloat(share.toFixed(2)),
        };
      })
      .sort((a, b) => b.Orders - a.Orders);
  }, [filteredData, state.incomeServices]);

  // Chart 3: Operational Expenses by Department
  const deptOpExAnalysis = useMemo(() => {
    const { expenseEntries } = filteredData;
    const deptMap = new Map<string, number>();

    expenseEntries.forEach((e) => {
      // Filter out COGS
      const cat = state.expenseCategories.find((c) => c.id === e.categoryId);
      const group = cat
        ? state.expenseGroups.find((g) => g.id === cat.groupId)
        : null;
      if (group?.isCOGS) return;

      if (e.isShared) {
        // Distribute among active employees
        const activeEmps = state.employees.filter((emp) => {
          const joined = !emp.startDate || emp.startDate <= e.date;
          const left = emp.endDate && emp.endDate < e.date;
          return joined && !left;
        });

        if (activeEmps.length > 0) {
          const share = e.amount / activeEmps.length;
          activeEmps.forEach((emp) => {
            const dName =
              state.departments.find((d) => d.id === emp.departmentId)?.name ||
              "Unknown";
            deptMap.set(dName, (deptMap.get(dName) || 0) + share);
          });
        } else {
          // Fallback if no active staff found (unlikely)
          deptMap.set(
            "Unallocated",
            (deptMap.get("Unallocated") || 0) + e.amount,
          );
        }
      } else {
        // Direct Assignment
        const dName = e.departmentId
          ? state.departments.find((d) => d.id === e.departmentId)?.name ||
            "Unknown"
          : "SHARED / GENERAL";
        deptMap.set(dName, (deptMap.get(dName) || 0) + e.amount);
      }
    });

    return Array.from(deptMap.entries())
      .map(([name, value]) => ({ name, Amount: value }))
      .sort((a, b) => b.Amount - a.Amount);
  }, [
    filteredData,
    state.departments,
    state.expenseCategories,
    state.expenseGroups,
    state.employees,
  ]);

  // Chart 4: Expenses by Category Logic
  const catOpExFull = useMemo(() => {
    const { expenseEntries } = filteredData;
    const opExEntries = expenseEntries.filter((e) => {
      const cat = state.expenseCategories.find((c) => c.id === e.categoryId);
      const group = cat
        ? state.expenseGroups.find((g) => g.id === cat.groupId)
        : null;
      return !group?.isCOGS;
    });

    const catMap = new Map<string, number>();
    opExEntries.forEach((e) => {
      const catName =
        state.expenseCategories.find((c) => c.id === e.categoryId)?.name ||
        "Unknown";
      catMap.set(catName, (catMap.get(catName) || 0) + e.amount);
    });

    return Array.from(catMap.entries())
      .map(([name, value]) => ({ name, Amount: value }))
      .sort((a, b) => b.Amount - a.Amount);
  }, [filteredData, state.expenseCategories, state.expenseGroups]);

  const catOpExChart = useMemo(() => {
    if (catOpExFull.length <= 10) return catOpExFull;
    const top10 = catOpExFull.slice(0, 10);
    const others = catOpExFull
      .slice(10)
      .reduce((sum, item) => sum + item.Amount, 0);
    return [...top10, { name: "Others", Amount: others }];
  }, [catOpExFull]);

  // --- Comparison Logic ---

  // Helper for Comparison Filter
  const isDateInCompareRange = (dateStr: string) => {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    if (compareFilter.year !== "all" && year !== compareFilter.year)
      return false;

    if (compareFilter.quarter !== "all") {
      const q = Math.ceil(month / 3);
      if (q !== compareFilter.quarter) return false;
    }

    if (compareFilter.month !== "all" && month !== compareFilter.month)
      return false;
    if (compareFilter.day !== "all" && day !== compareFilter.day) return false;

    return true;
  };

  const compareFilteredData = useMemo(() => {
    if (!isCompareMode) return { incomeEntries: [], expenseEntries: [] };
    return {
      incomeEntries: state.incomeEntries.filter((i) =>
        isDateInCompareRange(i.date),
      ),
      expenseEntries: state.expenseEntries.filter((e) =>
        isDateInCompareRange(e.date),
      ),
    };
  }, [state, compareFilter, isCompareMode]);

  const compareMetrics = useMemo(() => {
    if (!isCompareMode) return null;
    const { incomeEntries } = compareFilteredData;
    const totalIncome = incomeEntries.reduce(
      (sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)),
      0,
    );
    return { totalIncome };
  }, [compareFilteredData, isCompareMode]);

  // Compare Chart 1: Income Analysis
  const incomeAnalysisCompare = useMemo(() => {
    if (!isCompareMode) return [];
    const { incomeEntries } = compareFilteredData;
    const services = state.incomeServices;
    const totalIncome = compareMetrics?.totalIncome || 1;

    return services
      .map((service) => {
        const serviceEntries = incomeEntries.filter(
          (i) => i.serviceId === service.id,
        );
        const income = serviceEntries.reduce(
          (sum, i) => sum + (i.amount - (i.totalRefundsAmount || 0)),
          0,
        );
        const cogs = serviceEntries.reduce(
          (sum, i) => sum + (i.cogs - (i.totalInspectorShareCancelled || 0)),
          0,
        );
        const grossProfit = income - cogs;
        const contribution = (income / totalIncome) * 100;

        return {
          name: service.name,
          Income: income,
          COGS: cogs,
          GrossProfit: grossProfit,
          Contribution: parseFloat(contribution.toFixed(2)),
        };
      })
      .sort((a, b) => b.Income - a.Income);
  }, [
    compareFilteredData,
    state.incomeServices,
    compareMetrics,
    isCompareMode,
  ]);

  // Compare Chart 2: Order Analysis
  const orderAnalysisCompare = useMemo(() => {
    if (!isCompareMode) return [];
    const { incomeEntries } = compareFilteredData;
    const services = state.incomeServices;
    const totalOrders =
      incomeEntries.reduce(
        (sum, i) => sum + (parseInt(i.ordersCount || "0") || 0),
        0,
      ) || 1;

    return services
      .map((service) => {
        const serviceEntries = incomeEntries.filter(
          (i) => i.serviceId === service.id,
        );
        const orders = serviceEntries.reduce(
          (sum, i) => sum + (parseInt(i.ordersCount || "0") || 0),
          0,
        );
        const share = (orders / totalOrders) * 100;

        return {
          name: service.name,
          Orders: orders,
          Share: parseFloat(share.toFixed(2)),
        };
      })
      .sort((a, b) => b.Orders - a.Orders);
  }, [compareFilteredData, state.incomeServices, isCompareMode]);

  // Compare OpEx: Map for looking up totals
  const deptOpExAnalysisCompareMap = useMemo(() => {
    if (!isCompareMode) return new Map<string, number>();
    const { expenseEntries } = compareFilteredData;
    const deptMap = new Map<string, number>();

    expenseEntries.forEach((e) => {
      const cat = state.expenseCategories.find((c) => c.id === e.categoryId);
      const group = cat
        ? state.expenseGroups.find((g) => g.id === cat.groupId)
        : null;
      if (group?.isCOGS) return;

      if (e.isShared) {
        const activeEmps = state.employees.filter((emp) => {
          const joined = !emp.startDate || emp.startDate <= e.date;
          const left = emp.endDate && emp.endDate < e.date;
          return joined && !left;
        });
        if (activeEmps.length > 0) {
          const share = e.amount / activeEmps.length;
          activeEmps.forEach((emp) => {
            const dName =
              state.departments.find((d) => d.id === emp.departmentId)?.name ||
              "Unknown";
            deptMap.set(dName, (deptMap.get(dName) || 0) + share);
          });
        } else {
          deptMap.set(
            "Unallocated",
            (deptMap.get("Unallocated") || 0) + e.amount,
          );
        }
      } else {
        const dName = e.departmentId
          ? state.departments.find((d) => d.id === e.departmentId)?.name ||
            "Unknown"
          : "SHARED / GENERAL";
        deptMap.set(dName, (deptMap.get(dName) || 0) + e.amount);
      }
    });
    return deptMap;
  }, [
    compareFilteredData,
    state.departments,
    state.expenseCategories,
    state.expenseGroups,
    state.employees,
    isCompareMode,
  ]);

  const catOpExFullCompareMap = useMemo(() => {
    if (!isCompareMode) return new Map<string, number>();
    const { expenseEntries } = compareFilteredData;
    const catMap = new Map<string, number>();

    expenseEntries.forEach((e) => {
      const cat = state.expenseCategories.find((c) => c.id === e.categoryId);
      const group = cat
        ? state.expenseGroups.find((g) => g.id === cat.groupId)
        : null;
      if (!group?.isCOGS) {
        const catName = cat?.name || "Unknown";
        catMap.set(catName, (catMap.get(catName) || 0) + e.amount);
      }
    });

    return catMap;
  }, [
    compareFilteredData,
    state.expenseCategories,
    state.expenseGroups,
    isCompareMode,
  ]);

  // Chart 5: Stacked Bar Chart - Orders by Service (Monthly)
  const monthlyServiceData = useMemo(() => {
    const yearToFilter =
      typeof dateFilter.year === "number"
        ? dateFilter.year
        : new Date().getFullYear();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    // Distinct colors for up to 10 services
    const colors = [
      "#3b82f6",
      "#8b5cf6",
      "#10b981",
      "#f59e0b",
      "#ec4899",
      "#6366f1",
      "#14b8a6",
      "#f43f5e",
      "#84cc16",
      "#0ea5e9",
    ];

    // Initialize data structure
    const data = months.map((m) => {
      const entry: any = { name: m, total: 0 };
      state.incomeServices.forEach((s) => (entry[s.name] = 0));
      return entry;
    });

    state.incomeEntries.forEach((entry) => {
      const d = new Date(entry.date);
      if (d.getFullYear() === yearToFilter) {
        const monthIndex = d.getMonth();
        const serviceName = state.incomeServices.find(
          (s) => s.id === entry.serviceId,
        )?.name;

        if (serviceName) {
          const orders = parseInt(entry.ordersCount || "0") || 0;
          data[monthIndex][serviceName] += orders;
          data[monthIndex].total += orders;
        }
      }
    });

    return { data, colors };
  }, [state.incomeEntries, state.incomeServices, dateFilter.year]);

  const handleGenerateAI = async () => {
    if (
      filteredData.expenseEntries.length === 0 &&
      filteredData.incomeEntries.length === 0
    )
      return;
    setLoadingAi(true);
    const insights = await getFinancialInsights(state);
    setAiInsights(insights);
    setLoadingAi(false);
  };

  const availableYears = useMemo(() => {
    const years = new Set([
      ...state.incomeEntries.map((i) => new Date(i.date).getFullYear()),
      ...state.expenseEntries.map((e) => new Date(e.date).getFullYear()),
    ]);
    return Array.from(years).sort((a, b) => b - a);
  }, [state]);

  if (
    state.departments.length === 0 &&
    state.expenseEntries.length === 0 &&
    state.incomeEntries.length === 0
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="bg-indigo-100 p-6 rounded-full">
          <i className="fas fa-chart-line text-4xl text-indigo-500"></i>
        </div>
        <h2 className="text-xl font-bold text-slate-800">
          No data available yet
        </h2>
        <p className="text-slate-500 max-w-xs">
          Start by adding Departments and Accounting entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            Financial Insights
          </h2>
          <p className="text-slate-500 text-sm">
            Real-time departmental performance monitoring.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={isCompareMode}
              onChange={(e) => setIsCompareMode(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
            />
            <span className="text-sm font-bold text-slate-700 select-none">
              Compare Dates
            </span>
          </label>
          <button
            onClick={handleGenerateAI}
            disabled={loadingAi}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            <i
              className={`fas ${loadingAi ? "fa-spinner fa-spin" : "fa-wand-magic-sparkles"}`}
            ></i>{" "}
            AI Insights
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <DateFilter
          filter={dateFilter}
          onChange={setDateFilter}
          availableYears={availableYears}
        />

        {isCompareMode && (
          <div className="animate-fadeIn pl-8 border-l-4 border-indigo-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">
                Comparing With:
              </span>
            </div>
            <DateFilter
              filter={compareFilter}
              onChange={setCompareFilter}
              availableYears={availableYears}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Revenue (Net)",
            value: metrics.totalIncome,
            color: "text-emerald-600",
          },
          {
            label: "COGS Total",
            value: metrics.cogsValue,
            color: "text-amber-600",
          },
          {
            label: "Gross Profit",
            value: metrics.grossProfit,
            color: "text-blue-600",
          },
          {
            label: "Op. Cost (Net)",
            value: metrics.operationalExpenses,
            color: "text-rose-600",
          },
          {
            label: "Net Profit",
            value: metrics.netProfit,
            color: metrics.netProfit >= 0 ? "text-indigo-600" : "text-rose-600",
          },
          {
            label: "Total Payable",
            value: metrics.totalPayable,
            color: "text-orange-600",
          },
        ].map((card, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
              {card.label}
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`text-lg font-black ${card.color}`}>
                {formatCurrency(card.value)}
              </span>
              <span className="text-[9px] font-bold text-slate-300">SAR</span>
            </div>
          </div>
        ))}
      </div>

      {aiInsights && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl shadow-inner animate-fadeIn">
          <div className="prose prose-sm prose-indigo max-w-none text-indigo-800 italic whitespace-pre-wrap">
            {aiInsights}
          </div>
        </div>
      )}

      {/* Split Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Income vs COGS & Contribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase tracking-widest text-xs">
            Service Income Analysis
          </h3>
          <div className="flex-1 min-h-0 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={incomeAnalysis}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "Contribution"
                      ? `${value}%`
                      : formatCurrency(value),
                    name,
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="Income"
                  fill="#3b82f6"
                  name="Income"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="COGS"
                  fill="#f59e0b"
                  name="COGS"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Contribution"
                  stroke="#10b981"
                  name="Income Contribution %"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table 1 */}
          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 pl-2">Service</th>
                  <th className="py-2 text-right">Income</th>
                  <th className="py-2 text-right">COGS</th>
                  <th className="py-2 text-right">Gross Profit</th>
                  <th className="py-2 text-right pr-2">Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {incomeAnalysis.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pl-2 font-medium">{item.name}</td>
                    <td className="py-2 text-right text-blue-600">
                      {formatCurrency(item.Income)}
                    </td>
                    <td className="py-2 text-right text-amber-600">
                      {formatCurrency(item.COGS)}
                    </td>
                    <td className="py-2 text-right text-indigo-600">
                      {formatCurrency(item.GrossProfit)}
                    </td>
                    <td className="py-2 text-right text-emerald-600 pr-2">
                      {item.Contribution}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isCompareMode && (
              <div className="mt-6 border-t border-slate-100 pt-4 animate-fadeIn">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-2">
                  Comparison Data ({compareFilter.year})
                </h4>
                <table className="w-full text-xs text-left bg-slate-50/50 rounded-lg">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="py-2 pl-2">Service</th>
                      <th className="py-2 text-right">Income</th>
                      <th className="py-2 text-right">COGS</th>
                      <th className="py-2 text-right">Gross Profit</th>
                      <th className="py-2 text-right pr-2">Contr.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-500">
                    {incomeAnalysisCompare.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 pl-2 font-medium">{item.name}</td>
                        <td className="py-2 text-right text-blue-400">
                          {formatCurrency(item.Income)}
                        </td>
                        <td className="py-2 text-right text-amber-400">
                          {formatCurrency(item.COGS)}
                        </td>
                        <td className="py-2 text-right text-indigo-400">
                          {formatCurrency(item.GrossProfit)}
                        </td>
                        <td className="py-2 text-right text-emerald-400 pr-2">
                          {item.Contribution}%
                        </td>
                      </tr>
                    ))}
                    {incomeAnalysisCompare.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-4 text-center text-slate-400 italic"
                        >
                          No data in comparison period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Orders & Order Share */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[600px]">
          <h3 className="font-bold text-slate-800 mb-6 uppercase tracking-widest text-xs">
            Order Volume Analysis
          </h3>
          <div className="flex-1 min-h-0 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={orderAnalysis}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  unit="%"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "Share" ? `${value}%` : value,
                    name,
                  ]}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="Orders"
                  fill="#8b5cf6"
                  name="Orders Count"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="Share"
                  stroke="#ef4444"
                  name="Order Share %"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Data Table 2 */}
          <div className="overflow-x-auto min-h-[200px]">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-2 pl-2">Service</th>
                  <th className="py-2 text-right">Orders Count</th>
                  <th className="py-2 text-right pr-2">Order Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {orderAnalysis.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pl-2 font-medium">{item.name}</td>
                    <td className="py-2 text-right text-purple-600">
                      {item.Orders}
                    </td>
                    <td className="py-2 text-right text-rose-600 pr-2">
                      {item.Share}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {isCompareMode && (
              <div className="mt-6 border-t border-slate-100 pt-4 animate-fadeIn">
                <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-2">
                  Comparison Data ({compareFilter.year})
                </h4>
                <table className="w-full text-xs text-left bg-slate-50/50 rounded-lg">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400">
                      <th className="py-2 pl-2">Service</th>
                      <th className="py-2 text-right">Orders Count</th>
                      <th className="py-2 text-right pr-2">Order Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-500">
                    {orderAnalysisCompare.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 pl-2 font-medium">{item.name}</td>
                        <td className="py-2 text-right text-purple-400">
                          {item.Orders}
                        </td>
                        <td className="py-2 text-right text-rose-400 pr-2">
                          {item.Share}%
                        </td>
                      </tr>
                    ))}
                    {orderAnalysisCompare.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-center text-slate-400 italic"
                        >
                          No data in comparison period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stacked Bar Chart Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8">
          <div>
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-1">
              Service Orders Trends
            </h3>
            <p className="text-slate-500 text-xs">
              Monthly breakdown of order volume by service for{" "}
              {typeof dateFilter.year === "number"
                ? dateFilter.year
                : new Date().getFullYear()}
            </p>
          </div>

          {/* Service Filters */}
          <div className="flex flex-wrap gap-2">
            {state.incomeServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              return (
                <label
                  key={service.id}
                  className={`
                            flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-bold border transition-all select-none
                            ${
                              isSelected
                                ? "bg-slate-800 text-white border-slate-800 shadow-md"
                                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                            }
                        `}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServiceIds((prev) => [...prev, service.id]);
                      } else {
                        setSelectedServiceIds((prev) =>
                          prev.filter((id) => id !== service.id),
                        );
                      }
                    }}
                  />
                  {isSelected && <i className="fas fa-check text-[10px]"></i>}
                  {service.name}
                </label>
              );
            })}
            {state.incomeServices.length > 0 && (
              <button
                onClick={() =>
                  setSelectedServiceIds(
                    selectedServiceIds.length === state.incomeServices.length
                      ? []
                      : state.incomeServices.map((s) => s.id),
                  )
                }
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors ml-2"
              >
                {selectedServiceIds.length === state.incomeServices.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            )}
          </div>
        </div>

        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyServiceData.data}
              margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              barCategoryGap={32}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "#64748b", fontWeight: 500 }}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow:
                    "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                }}
                cursor={{ fill: "#f1f5f9", radius: 4 }}
                itemStyle={{
                  fontSize: "12px",
                  fontWeight: 500,
                  padding: "2px 0",
                }}
                labelStyle={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  paddingBottom: "8px",
                  color: "#1e293b",
                }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: "30px" }} />
              {state.incomeServices.map(
                (service, index) =>
                  selectedServiceIds.includes(service.id) && (
                    <Bar
                      key={service.id}
                      dataKey={service.name}
                      fill={
                        monthlyServiceData.colors[
                          index % monthlyServiceData.colors.length
                        ]
                      }
                      name={service.name}
                      animationDuration={1000}
                    />
                  ),
              )}
            </BarChart>
</ResponsiveContainer>
        </div>

        {/* Data Table: Service Orders */}
        <div className="overflow-x-auto border-t border-slate-50 pt-4 px-4 pb-2">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50">
                <th className="py-2 pl-3 rounded-l-lg min-w-[120px]">
                  Service
                </th>
                {monthlyServiceData.data.map((m: any) => (
                  <th key={m.name} className="py-2 text-center min-w-[40px]">
                    {m.name}
                  </th>
                ))}
                <th className="py-2 text-right pr-3 rounded-r-lg min-w-[60px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              {state.incomeServices.map((service) => {
                if (!selectedServiceIds.includes(service.id)) return null;
                const serviceTotal = monthlyServiceData.data.reduce(
                  (sum: number, m: any) => sum + (m[service.name] || 0),
                  0,
                );
                return (
                  <tr
                    key={service.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-2 pl-3 font-medium text-slate-600">
                      {service.name}
                    </td>
                    {monthlyServiceData.data.map((m: any, i: number) => (
                      <td key={i} className="py-2 text-center text-slate-500">
                        {m[service.name] || 0}
                      </td>
                    ))}
                    <td className="py-2 text-right pr-3 font-bold text-slate-700">
                      {serviceTotal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-slate-100 bg-slate-50">
              <tr>
                <td className="py-3 pl-3 font-black text-slate-700 uppercase tracking-wider">
                  Total
                </td>
                {monthlyServiceData.data.map((m: any, i: number) => {
                  const monthTotal = state.incomeServices.reduce(
                    (sum, service) => {
                      if (!selectedServiceIds.includes(service.id)) return sum;
                      return sum + (m[service.name] || 0);
                    },
                    0,
                  );
                  return (
                    <td
                      key={i}
                      className="py-3 text-center font-black text-indigo-600 text-xs"
                    >
                      {monthTotal}
                    </td>
                  );
                })}
                <td className="py-3 text-right pr-3 font-black text-indigo-700 text-sm">
                  {monthlyServiceData.data.reduce((grandSum: number, m: any) => {
                    const monthTotal = state.incomeServices.reduce(
                      (sum, service) => {
                        if (!selectedServiceIds.includes(service.id)) return sum;
                        return sum + (m[service.name] || 0);
                      },
                      0,
                    );
                    return grandSum + monthTotal;
                  }, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
      </div>
      </div>

      {/* Split Charts Row 2: OpEx Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Chart 3: OpEx by Dept */}
        <div className="bg-white py-6 pr-6 pl-1 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 pl-4 uppercase tracking-widest text-xs">
            Operational Expenses by Department
          </h3>
          {/* Dynamic Height based on items count, min 400px */}
          <div
            className={`w-full mb-4`}
            style={{ height: Math.max(400, deptOpExAnalysis.length * 50) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={deptOpExAnalysis}
                layout="vertical"
                margin={{ left: 0, right: 30, top: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  domain={["0", "auto"]}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(val) => `SAR ${val / 1000}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  width={195}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Expense Amount",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="Amount"
                  fill="#ef4444"
                  name="Expense Amount"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                >
                  <LabelList
                    dataKey="Amount"
                    position="right"
                    formatter={(val: number) => formatCurrency(val)}
                    style={{
                      fontSize: "10px",
                      fill: "#64748b",
                      fontWeight: "bold",
                    }}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto border-t border-slate-50 pt-4 px-4">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50">
                  <th className="py-2 pl-3 rounded-l-lg">Department</th>
                  <th className="py-2 text-right pr-3">Total Expenses</th>
                  {isCompareMode && (
                    <th className="py-2 text-right pr-3 rounded-r-lg text-indigo-400">
                      Compare ({compareFilter.year})
                    </th>
                  )}
                  {!isCompareMode && (
                    <th className="py-0 px-0 rounded-r-lg"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {deptOpExAnalysis.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td
                      className="py-2 pl-3 font-medium truncate max-w-[200px]"
                      title={item.name}
                    >
                      {item.name}
                    </td>
                    <td className="py-2 text-right pr-3 font-mono text-rose-600 font-bold">
                      {formatCurrency(item.Amount)}
                    </td>
                    {isCompareMode && (
                      <td className="py-2 text-right pr-3 font-mono text-slate-400">
                        {formatCurrency(
                          deptOpExAnalysisCompareMap.get(item.name) || 0,
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-100 bg-slate-50">
                <tr>
                  <td className="py-3 pl-3 font-black text-slate-700 uppercase tracking-wider">
                    Total
                  </td>
                  <td className="py-3 text-right pr-3 font-black text-rose-700 text-sm">
                    {formatCurrency(
                      deptOpExAnalysis.reduce(
                        (sum, item) => sum + item.Amount,
                        0,
                      ),
                    )}
                  </td>
                  {isCompareMode && (
                    <td className="py-3 text-right pr-3 font-black text-slate-400 text-sm">
                      {formatCurrency(
                        (
                          Array.from(
                            deptOpExAnalysisCompareMap.values(),
                          ) as number[]
                        ).reduce((a, b) => a + b, 0),
                      )}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Chart 4: OpEx by Category */}
        <div className="bg-white py-6 pr-6 pl-1 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 pl-4 uppercase tracking-widest text-xs">
            Top Expenses by Category
          </h3>
          {/* Dynamic Height */}
          <div
            className={`w-full mb-4`}
            style={{ height: Math.max(400, catOpExChart.length * 50) }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={catOpExChart}
                layout="vertical"
                margin={{ left: 0, right: 60, top: 20, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  type="number"
                  domain={["0", "auto"]}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(val) => `SAR ${val / 1000}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#64748b", fontWeight: 600 }}
                  width={195}
                  interval={0}
                />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  formatter={(value: number) => [
                    formatCurrency(value),
                    "Expense Amount",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="Amount"
                  fill="#8b5cf6"
                  name="Expense Amount"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                >
                  <LabelList
                    dataKey="Amount"
                    position="right"
                    formatter={(val: number) => formatCurrency(val)}
                    style={{
                      fontSize: "10px",
                      fill: "#64748b",
                      fontWeight: "bold",
                    }}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto border-t border-slate-50 pt-4 max-h-[400px] px-4">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 bg-slate-50/50">
                  <th className="py-2 pl-3 rounded-l-lg">Category</th>
                  <th className="py-2 text-right pr-3">Total Expenses</th>
                  {isCompareMode && (
                    <th className="py-2 text-right pr-3 rounded-r-lg text-indigo-400">
                      Compare ({compareFilter.year})
                    </th>
                  )}
                  {!isCompareMode && (
                    <th className="py-0 px-0 rounded-r-lg"></th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-slate-700">
                {catOpExFull.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td
                      className="py-2 pl-3 font-medium truncate max-w-[200px]"
                      title={item.name}
                    >
                      {item.name}
                    </td>
                    <td className="py-2 text-right pr-3 font-mono text-purple-600 font-bold">
                      {formatCurrency(item.Amount)}
                    </td>
                    {isCompareMode && (
                      <td className="py-2 text-right pr-3 font-mono text-slate-400">
                        {formatCurrency(
                          catOpExFullCompareMap.get(item.name) || 0,
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-100 bg-slate-50 sticky bottom-0">
                <tr>
                  <td className="py-3 pl-3 font-black text-slate-700 uppercase tracking-wider">
                    Total
                  </td>
                  <td className="py-3 text-right pr-3 font-black text-purple-700 text-sm">
                    {formatCurrency(
                      catOpExFull.reduce((sum, item) => sum + item.Amount, 0),
                    )}
                  </td>
                  {isCompareMode && (
                    <td className="py-3 text-right pr-3 font-black text-slate-400 text-sm">
                      {formatCurrency(
                        (
                          Array.from(catOpExFullCompareMap.values()) as number[]
                        ).reduce((a, b) => a + b, 0),
                      )}
                    </td>
                  )}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
