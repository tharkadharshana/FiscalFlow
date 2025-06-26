
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import { Textarea } from './ui/textarea';
import { useMemo, useEffect } from 'react';
import type { Transaction } from '@/types';
import { Switch } from './ui/switch';

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  source: z.string().min(2, 'Source must be at least 2 characters.'),
  category: z.string({ required_error: 'Please select a category.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  notes: z.string().optional(),
  financialPlanId: z.string().optional(),
  planItemId: z.string().optional(),
  isTaxDeductible: z.boolean().optional(),
});

type ManualEntryFormProps = {
  onFormSubmit: () => void;
  transactionToEdit?: Transaction | null;
}

const defaultValues = {
  amount: 0,
  source: '',
  notes: '',
  date: new Date(),
  category: '',
  financialPlanId: undefined,
  planItemId: undefined,
  isTaxDeductible: false,
};

export function ManualEntryForm({ onFormSubmit, transactionToEdit }: ManualEntryFormProps) {
  const { addTransaction, updateTransaction, financialPlans, expenseCategories } = useAppContext();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        amount: transactionToEdit.amount,
        source: transactionToEdit.source,
        category: transactionToEdit.category,
        date: parseISO(transactionToEdit.date),
        notes: transactionToEdit.notes || '',
        financialPlanId: transactionToEdit.financialPlanId || undefined,
        planItemId: transactionToEdit.planItemId || undefined,
        isTaxDeductible: transactionToEdit.isTaxDeductible || false,
      });
    } else {
      form.reset(defaultValues);
    }
  }, [transactionToEdit, form]);

  const selectedPlanId = form.watch('financialPlanId');

  const selectedPlanItems = useMemo(() => {
    if (!selectedPlanId) return [];
    const plan = financialPlans.find(p => p.id === selectedPlanId);
    return plan?.items || [];
  }, [selectedPlanId, financialPlans]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const data = {
        ...values,
        type: 'expense',
        date: values.date.toISOString(),
    };
    if (transactionToEdit) {
        updateTransaction(transactionToEdit.id, data as Partial<Transaction>);
    } else {
        addTransaction(data);
    }
    onFormSubmit();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0.00" {...field} />
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
                            "pl-3 text-left font-normal",
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

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Store / Vendor</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Starbucks, Amazon" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {expenseCategories.map((cat) => (
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
        
        <div className="space-y-4 rounded-md border p-4">
            <h3 className="text-sm font-medium text-muted-foreground">Link to Plan (Optional)</h3>
            <FormField
                control={form.control}
                name="financialPlanId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Financial Plan</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value === 'none' ? undefined : value);
                                form.setValue('planItemId', undefined); // Reset item when plan changes
                            }} 
                            value={field.value}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a plan to link this expense to" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {financialPlans.filter(p => p.status === 'planning' || p.status === 'active').map((plan) => (
                                    <SelectItem key={plan.id} value={plan.id}>
                                    {plan.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            {selectedPlanId && (
                <FormField
                    control={form.control}
                    name="planItemId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Plan Item</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger disabled={!selectedPlanId}>
                                        <SelectValue placeholder="Select a plan item" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {selectedPlanItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.description} (Predicted: ${item.predictedCost})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
        
        <FormField
            control={form.control}
            name="isTaxDeductible"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                        <FormLabel className="text-base">Tax Deductible</FormLabel>
                        <FormDescription>Mark this if it's a business or other tax-deductible expense.</FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                </FormItem>
            )}
        />


        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g. Coffee with friends" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full font-bold">{transactionToEdit ? 'Save Changes' : 'Add Expense'}</Button>
      </form>
    </Form>
  );
}
