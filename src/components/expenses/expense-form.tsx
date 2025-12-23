"use client";

import { useForm } from "react-hook-form";
import { podResolver } from "@hookform/resolvers/zod"; // Wait, I need zodResolver
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createExpense } from "@/actions/expenses";
import { toast } from "sonner";
import { useState, useTransition } from "react";

const formSchema = z.object({
  journalNumber: z.string().min(1, "Journal number is required"),
  date: z.date(),
  amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be greater than 0"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  departmentId: z.string().min(1, "Department is required"),
  employeeId: z.string().optional(), // Can be "none" or valid ID
});

interface ExpenseFormProps {
  departments: { id: number; name: string }[];
  employees: { id: number; name: string; departmentId: number }[];
  categories: { id: number; name: string; groupId: number; group: { name: string } }[];
}

export function ExpenseForm({ departments, employees, categories }: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      journalNumber: `J-${Math.floor(Math.random() * 10000)}`,
      date: new Date(),
      amount: "",
      description: "",
      categoryId: "",
      departmentId: "",
      employeeId: "none",
    },
  });

  const selectedDeptId = form.watch("departmentId");
  
  // Filter employees based on selected department
  const filteredEmployees = employees.filter(
    (emp) => emp.departmentId.toString() === selectedDeptId
  );

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
        try {
            await createExpense({
                journalNumber: values.journalNumber,
                date: values.date,
                amount: values.amount,
                description: values.description || "",
                categoryId: parseInt(values.categoryId),
                departmentId: parseInt(values.departmentId),
                employeeId: values.employeeId && values.employeeId !== "none" ? parseInt(values.employeeId) : null,
            });
            toast.success("Expense registered successfully");
            form.reset({
                journalNumber: `J-${Math.floor(Math.random() * 10000)}`,
                date: new Date(),
                amount: "",
                description: "",
                categoryId: "",
                departmentId: "",
                employeeId: "none",
            });
        } catch (error) {
            toast.error("Failed to register expense");
            console.error(error);
        }
    });
  }

  // Group categories by their group
  const groupedCategories = categories.reduce((acc, cat) => {
    const groupName = cat.group.name;
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {} as Record<string, typeof categories>);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="journalNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Journal Number</FormLabel>
                  <FormControl>
                    <Input placeholder="J-1001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (SAR)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Expense Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {Object.entries(groupedCategories).map(([group, cats]) => (
                                <div key={group}>
                                    <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                                        {group}
                                    </div>
                                    {cats.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </div>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                    {dept.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Employee (Optional)</FormLabel>
                    <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={!selectedDeptId}
                    >
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={selectedDeptId ? "Select employee" : "Select department first"} />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {filteredEmployees.map((emp) => (
                                <SelectItem key={emp.id} value={emp.id.toString()}>
                                    {emp.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Details about the expense..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Registering..." : "Submit Expense"}
        </Button>
      </form>
    </Form>
  );
}
