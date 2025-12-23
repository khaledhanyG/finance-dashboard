
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const getFinancialInsights = async (state: AppState) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Format data for the prompt
  const departmentsData = state.departments.map(d => {
    const deptExpenses = state.expenseEntries
      .filter(e => e.departmentId === d.id)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const deptSalaries = state.employees
      .filter(e => e.departmentId === d.id)
      .reduce((sum, e) => sum + e.salary, 0);

    return {
      name: d.name,
      expenses: deptExpenses + deptSalaries,
    };
  });

  const totalIncome = state.incomeEntries.reduce((sum, i) => sum + i.amount, 0);

  const prompt = `
    Analyze the following financial data:
    Total Revenue: ${totalIncome}
    Department Expenses (Operational + Salaries): ${JSON.stringify(departmentsData)}
    Total Employees: ${state.employees.length}
    Total Expense Entries: ${state.expenseEntries.length}
    Total Income Entries: ${state.incomeEntries.length}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional financial consultant. Provide 3-4 professional strategic insights identifying high-cost departments, profitability gaps, and suggestions for optimization. Keep the response concise and formatted in markdown.",
      }
    });
    // Extract text directly from the response property
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate AI insights at this time. Please check your data or try again later.";
  }
};
