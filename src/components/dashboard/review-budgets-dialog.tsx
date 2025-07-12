
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Trash2, Lightbulb, Plus } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Budget } from '@/types';
import { nanoid } from 'nanoid';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

type ReviewBudgetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToEdit?: Budget | null;
};

const budgetItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description can't be empty."),
  predictedCost: z.coerce.number().optional(),
});

const singleBudgetSchema = z.object({
  id: z.string(),
  category: z.string({ required_error: 'Please select a category.' }).min(1, "Category can't be empty."),
  limit: z.coerce.number().min(0.01, 'Limit must be greater than 0.'),
  items: z.array(budgetItemSchema).optional(),
});

const formSchema = z.object({
  budgets: z.array(singleBudgetSchema),
});

type FormData = z.infer<typeof formSchema>;

const BudgetItemsFieldArray = ({ budgetIndex, control, register }: { budgetIndex: number, control: any, register: any }) => {
    const { fields, append, remove } = useFieldArray({
      control,
      name: `budgets.${budgetIndex}.items`,
    });
    return (
        <div className="space-y-2 mt-2">
            <FormLabel className="text-xs text-muted-foreground">Checklist Items (Optional)</FormLabel>
            <ScrollArea className="max-h-32 w-full pr-3">
                <div className="space-y-2">
                    {fields.map((item, itemIndex) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <Input {...register(`budgets.${budgetIndex}.items.${itemIndex}.description`)} placeholder="e.g. Milk, Bread" className="h-8"/>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(itemIndex)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => append({id: nanoid(), description: '', predictedCost: 0})}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>
    );
  }

export function ReviewBudgetsDialog({ open, onOpenChange, budgetToEdit }: ReviewBudgetsDialogProps) {
  const { userProfile, addBudget, updateBudget, showNotification, expenseCategories, generatedBudgets, setGeneratedBudgets } = useAppContext();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { budgets: [] },
  });

  const { fields, remove, append, replace } = useFieldArray({
    control: form.control,
    name: 'budgets',
  });
  
  useEffect(() => {
    if (open) {
      if (budgetToEdit) {
          replace([{
              id: budgetToEdit.id,
              category: budgetToEdit.category,
              limit: budgetToEdit.limit,
              items: budgetToEdit.items || []
          }]);
      } else if (generatedBudgets && generatedBudgets.length > 0) {
          replace(generatedBudgets.map(b => ({...b, id: nanoid() })));
          setGeneratedBudgets([]); // Clear after use
      } else {
          replace([{ id: nanoid(), category: '', limit: 0, items: [] }]);
      }
    }
  }, [open, budgetToEdit, generatedBudgets, replace, setGeneratedBudgets]);

  const handleSaveBudgets = async (data: FormData) => {
    let count = 0;
    for (const budget of data.budgets) {
        if (budgetToEdit) {
            await updateBudget(budgetToEdit.id, budget);
        } else {
            await addBudget({...budget });
        }
        count++;
    }
    if (count > 0) {
      showNotification({
        type: 'success',
        title: budgetToEdit ? 'Budget Updated' : `${count} Budget(s) Created`,
        description: budgetToEdit ? `Your budget for ${data.budgets[0].category} has been updated.` : 'Your monthly budgets have been set.',
    });
    }
    onOpenChange(false);
  };
  
  const isReviewingAiResult = !budgetToEdit && generatedBudgets.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-headline text-2xl">{budgetToEdit ? 'Edit Budget' : 'Add/Review Budgets'}</DialogTitle>
            <DialogDescription>
            {isReviewingAiResult
                ? "The AI has generated the following budgets. Review them and make any necessary changes before saving."
                : "Manually add a budget for a category, and optionally add checklist items to it."
            }
            </DialogDescription>
        </DialogHeader>

        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveBudgets)} className="flex-1 min-h-0 flex flex-col px-6 pb-6">
                <ScrollArea className="flex-1 -mx-6 pr-6 pl-6">
                    <div className="space-y-3 pb-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex flex-col gap-2 rounded-md border p-3">
                        <div className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-5 gap-x-3">
                                <FormField
                                control={form.control}
                                name={`budgets.${index}.category`}
                                render={({ field }) => (
                                    <FormItem className="col-span-3">
                                    <FormLabel className="text-xs text-muted-foreground">Category</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value} disabled={!!budgetToEdit}>
                                        <FormControl>
                                        <SelectTrigger className="h-8">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                        {expenseCategories.map(cat => (
                                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                        ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                                <FormField
                                control={form.control}
                                name={`budgets.${index}.limit`}
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                    <FormLabel className="text-xs text-muted-foreground">Monthly Limit ({userProfile?.currencyPreference || '$'})</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" className="h-8" />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                            </div>
                            <BudgetItemsFieldArray budgetIndex={index} control={form.control} register={form.register} />
                            </div>
                            {!budgetToEdit && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground"/>
                            </Button>
                            )}
                        </div>
                        </div>
                    ))}
                    {(fields.length === 0 && isReviewingAiResult) && (
                        <Alert>
                        <Lightbulb className="h-4 w-4" />
                        <AlertTitle>No New Budgets Found</AlertTitle>
                        <AlertDescription>
                            The AI didn't find any new budgets to create from your request. This could be because they already exist. You can still add one manually.
                        </AlertDescription>
                        </Alert>
                    )}
                    {!budgetToEdit && (
                        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ id: nanoid(), category: '', limit: 0, items: [] })}>
                        <Plus className="mr-2 h-4 w-4" /> Add Another Budget
                        </Button>
                    )}
                    </div>
                </ScrollArea>

                <DialogFooter className="pt-4">
                    <Button type="submit" disabled={form.formState.isSubmitting || fields.length === 0}>Save Budgets</Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
