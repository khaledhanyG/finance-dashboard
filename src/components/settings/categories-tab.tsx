"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createExpenseGroup, createExpenseCategory, deleteExpenseGroup, deleteExpenseCategory } from "@/actions/settings";
import { Trash2, Plus, Folder, FileText } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CategoriesTabProps {
  groups: { 
      id: number; 
      name: string; 
      categories: { id: number; name: string }[] 
  }[];
}

export function CategoriesTab({ groups }: CategoriesTabProps) {
  const [isPending, startTransition] = useTransition();
  const [newGroup, setNewGroup] = useState("");
  const [newCat, setNewCat] = useState({ name: "", groupId: 0 });
  const [catDialogOpen, setCatDialogOpen] = useState(false);

  const handleCreateGroup = () => {
    if (!newGroup.trim()) return;
    startTransition(async () => {
      await createExpenseGroup(newGroup);
      setNewGroup("");
      toast.success("Group created");
    });
  };

  const handleCreateCategory = () => {
    if (!newCat.name || !newCat.groupId) return;
    startTransition(async () => {
      await createExpenseCategory(newCat.name, newCat.groupId);
      setNewCat({ name: "", groupId: 0 });
      setCatDialogOpen(false);
      toast.success("Category created");
    });
  };

  const handleDeleteGroup = (id: number) => {
    if(!confirm("Deleting a group will delete all its categories. Continue?")) return;
    startTransition(async () => {
        try {
            await deleteExpenseGroup(id);
            toast.success("Group deleted");
        } catch(e) {
            toast.error("Could not delete group. It may have expenses.");
        }
    });
  };

  const handleDeleteCategory = (id: number) => {
    startTransition(async () => {
        try {
            await deleteExpenseCategory(id);
            toast.success("Category deleted");
        } catch(e) {
            toast.error("Could not delete category. It may have expenses.");
        }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Categories</CardTitle>
        <CardDescription>Manage expense groups and their categories.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Group Creation */}
        <div className="flex gap-2 items-end border-b pb-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="group">New Group</Label>
            <Input 
                id="group"
                placeholder="e.g. Operational Costs" 
                value={newGroup} 
                onChange={(e) => setNewGroup(e.target.value)}
            />
          </div>
          <Button onClick={handleCreateGroup} disabled={isPending || !newGroup}>
            <Plus className="w-4 h-4 mr-2" /> Add Group
          </Button>
        </div>

        <div className="space-y-4">
             {groups.map((group) => (
                 <div key={group.id} className="border rounded-lg p-4 bg-card/50">
                     <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center font-semibold text-lg">
                             <Folder className="w-5 h-5 mr-2 text-blue-500" />
                             {group.name}
                         </div>
                         <div className="flex items-center gap-2">
                            <Dialog open={catDialogOpen && newCat.groupId === group.id} onOpenChange={(open) => {
                                setCatDialogOpen(open); 
                                if(open) setNewCat({...newCat, groupId: group.id});
                            }}>
                                <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                        <Plus className="w-4 h-4 mr-2" /> Add Category
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add Category to {group.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4">
                                        <Label>Category Name</Label>
                                        <Input 
                                            value={newCat.name} 
                                            onChange={(e) => setNewCat({...newCat, name: e.target.value})}
                                            placeholder="e.g. Rent"
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleCreateCategory} disabled={isPending}>Create</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                             <Button size="sm" variant="ghost" onClick={() => handleDeleteGroup(group.id)}>
                                 <Trash2 className="w-4 h-4 text-red-500" />
                             </Button>
                         </div>
                     </div>
                     
                     <div className="ml-7 space-y-1">
                         {group.categories.length === 0 && (
                             <p className="text-sm text-muted-foreground italic">No categories yet.</p>
                         )}
                         {group.categories.map((cat) => (
                             <div key={cat.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-sm">
                                 <div className="flex items-center">
                                     <FileText className="w-4 h-4 mr-2 text-slate-500" />
                                     {cat.name}
                                 </div>
                                 <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-6 w-6"
                                    onClick={() => handleDeleteCategory(cat.id)}
                                 >
                                     <Trash2 className="w-3 h-3 text-red-400" />
                                 </Button>
                             </div>
                         ))}
                     </div>
                 </div>
             ))}
        </div>
      </CardContent>
    </Card>
  );
}
