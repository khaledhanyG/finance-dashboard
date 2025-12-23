"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEmployee, deleteEmployee } from "@/actions/settings";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EmployeesTabProps {
  employees: { id: number; name: string; salary: string; department: { name: string } }[];
  departments: { id: number; name: string }[];
}

export function EmployeesTab({ employees, departments }: EmployeesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [newEmp, setNewEmp] = useState({ name: "", departmentId: "", salary: "" });

  const handleCreate = () => {
    if (!newEmp.name || !newEmp.departmentId || !newEmp.salary) return;
    startTransition(async () => {
      await createEmployee({
        name: newEmp.name,
        departmentId: parseInt(newEmp.departmentId),
        salary: newEmp.salary
      });
      setOpen(false);
      setNewEmp({ name: "", departmentId: "", salary: "" });
      toast.success("Employee created");
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteEmployee(id);
      toast.success("Employee deleted");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employees</CardTitle>
        <CardDescription>Manage employees and their salaries.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" /> Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Enter employee details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input 
                      id="name" 
                      value={newEmp.name} 
                      onChange={(e) => setNewEmp({...newEmp, name: e.target.value})}
                      className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="salary" className="text-right">Salary (SAR)</Label>
                    <Input 
                        id="salary" 
                        type="number"
                        value={newEmp.salary} 
                        onChange={(e) => setNewEmp({...newEmp, salary: e.target.value})}
                        className="col-span-3" 
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="dept" className="text-right">Department</Label>
                    <Select 
                        value={newEmp.departmentId} 
                        onValueChange={(val) => setNewEmp({...newEmp, departmentId: val})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreate} disabled={isPending}>Save changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary (SAR)</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>{emp.name}</TableCell>
                  <TableCell>{emp.department?.name}</TableCell>
                  <TableCell>{emp.salary}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(emp.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
