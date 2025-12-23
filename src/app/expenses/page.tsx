import { getDepartments, getEmployees } from "@/actions/settings";
import { getCategoriesForForm } from "@/actions/expenses";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExpensesPage() {
  const departments = await getDepartments();
  const employees = await getEmployees();
  const categories = await getCategoriesForForm();

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Expenses</h2>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle>Register New Expense</CardTitle>
            </CardHeader>
            <CardContent>
                <ExpenseForm 
                    departments={departments}
                    employees={employees}
                    categories={categories}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
