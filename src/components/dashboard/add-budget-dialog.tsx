'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppContext } from '@/contexts/app-context';
import { defaultCategories } from '@/data/mock-data';
import type { Budget } from '@/types';

const formSchema = z.object({
  limit: z.coerce.number().min(1, 'Budget limit must be greater than 0.'),
  category: z.string({ required_error: 'Please select a category.' }),
});

type AddBudgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToEdit?: Budget | null;
};

export function AddBudgetDialog({ open, onOpenChange, budgetToEdit }: AddBudgetDialogProps) {
  const { addBudget, updateBudget, budgets } = useAppContext();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      limit: 0,
      category: '',
    },
  });
  
  useEffect(() => {
    if (budgetToEdit) {
      form.reset({
        limit: budgetToEdit.limit,
        category: budgetToEdit.category,
      });
    } else {
      form.reset({
        limit: 0,
        category: '',
      });
    }
  }, [budgetToEdit, form, open]);

  const existingBudgetCategories = budgets.map(b => b.category);
  const availableCategories = defaultCategories.filter(
    c => !existingBudgetCategories.includes(c) || (budgetToEdit && c === budgetToEdit.category)
  );

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (budgetToEdit) {
      await updateBudget(budgetToEdit.id, values);
    } else {
      await addBudget(values);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{budgetToEdit ? 'Edit Budget' : 'Add New Budget'}</DialogTitle>
          <DialogDescription>
            Set a spending limit for a specific category for the current month.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid gap-4 py-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!budgetToEdit}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
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
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Limit</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {budgetToEdit ? 'Save Changes' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}