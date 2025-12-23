import { getDashboardMetrics, getExpensesByDepartment, getExpensesByCategory, getRecentExpenses } from "@/actions/dashboard";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { OverviewCharts } from "@/components/dashboard/overview-charts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const deptData = await getExpensesByDepartment();
  const catData = await getExpensesByCategory();
  const recentExpenses = await getRecentExpenses();

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {/* Add DateRangePicker here later */}
        </div>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports" disabled>Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <KPICards {...metrics} />
          
          <OverviewCharts deptData={deptData} catData={catData} />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest 5 expense entries.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {recentExpenses.map((expense) => (
                    <div className="flex items-center" key={expense.id}>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">{expense.description || 'Expense'}</p>
                        <p className="text-sm text-muted-foreground">
                          {expense.department.name} • {expense.employee?.name || 'General'}
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        -SAR {expense.amount}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
