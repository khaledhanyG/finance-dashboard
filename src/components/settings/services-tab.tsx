"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createIncomeService, deleteIncomeService } from "@/actions/settings";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ServicesTabProps {
  services: { id: number; name: string }[];
}

export function ServicesTab({ services }: ServicesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createIncomeService(newName);
      setNewName("");
      toast.success("Service created");
    });
  };

  const handleDelete = (id: number) => {
    startTransition(async () => {
      await deleteIncomeService(id);
      toast.success("Service deleted");
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Services</CardTitle>
        <CardDescription>Manage income service types.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="New Service Name" 
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
                <TableHead>Nam</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.name}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(service.id)}
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
