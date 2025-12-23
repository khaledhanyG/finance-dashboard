"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createDepartment, deleteDepartment } from "@/actions/settings";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DepartmentsTabProps {
  departments: { id: number; name: string }[];
}

export function DepartmentsTab({ departments }: DepartmentsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createDepartment(newName);
      setNewName("");
      toast.success("Department created");
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteDepartment(id);
      toast.success("Department deleted");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Departments</CardTitle>
        <CardDescription>Manage your organization's departments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="New Department Name" 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={isPending || !newName}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(dept.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {departments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No departments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
