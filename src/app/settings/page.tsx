import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getDepartments, getEmployees, getExpenseGroups, getIncomeServices } from "@/actions/settings";
import { DepartmentsTab } from "@/components/settings/departments-tab";
import { EmployeesTab } from "@/components/settings/employees-tab";
import { CategoriesTab } from "@/components/settings/categories-tab";
import { ServicesTab } from "@/components/settings/services-tab";

export default async function SettingsPage() {
  const departments = await getDepartments();
  const employees = await getEmployees();
  const groups = await getExpenseGroups();
  const services = await getIncomeServices();

  return (
    <div className="flex-1 space-y-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Tabs defaultValue="departments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>
        <TabsContent value="departments">
          <DepartmentsTab departments={departments} />
        </TabsContent>
        <TabsContent value="employees">
          <EmployeesTab employees={employees} departments={departments} />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab groups={groups} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab services={services} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
