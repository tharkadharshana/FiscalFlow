
'use client';

import { useEffect, useMemo } from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import type { RecurringTransaction } from '@/types';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  type: z.enum(['income', 'expense'], { required_error: 'You need to select a transaction type.' }),
  category: z.string({ required_error: 'Please select a category.' }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], { required_error: 'Please select a frequency.' }),
  startDate: z.date({ required_error: 'Please select a start date.' }),
  source: z.string().min(2, 'Source must be at least 2 characters.'),
  notes: z.string().optional(),
  isActive: z.boolean(),
});

type AddRecurringTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: RecurringTransaction | null;
};

export function AddRecurringTransactionDialog({ open, onOpenChange, transactionToEdit }: AddRecurringTransactionDialogProps) {
  const { addRecurringTransaction, updateRecurringTransaction, expenseCategories, incomeCategories } = useAppContext();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        title: '',
        amount: 0,
        type: 'expense',
        category: '',
        frequency: 'monthly',
        startDate: new Date(),
        source: '',
        notes: '',
        isActive: true,
    },
  });
  
  const transactionType = form.watch('type');

  const categoriesToShow = useMemo(() => {
    return transactionType === 'income' ? incomeCategories : expenseCategories;
  }, [transactionType, incomeCategories, expenseCategories]);

  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        startDate: parseISO(transactionToEdit.startDate),
      });
    } else {
      form.reset({
        title: '',
        amount: 0,
        type: 'expense',
        category: '',
        frequency: 'monthly',
        startDate: new Date(),
        source: '',
        notes: '',
        isActive: true,
      });
    }
  }, [transactionToEdit, form, open]);
  
  // Reset category if type changes and selected category is not in the new list
  useEffect(() => {
      if (!categoriesToShow.includes(form.getValues('category'))) {
          form.setValue('category', '');
      }
  }, [transactionType, categoriesToShow, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        startDate: values.startDate.toISOString(),
    }
    if (transactionToEdit) {
      await updateRecurringTransaction(transactionToEdit.id, dataToSave);
    } else {
      await addRecurringTransaction(dataToSave);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transactionToEdit ? 'Edit' : 'Add'} Recurring Transaction</DialogTitle>
          <DialogDescription>
            Schedule an automatic transaction for things like salaries or bills.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
            <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g. Netflix Subscription" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                <FormItem className="space-y-3">
                    <FormLabel>Transaction Type</FormLabel>
                    <FormControl>
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                    >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="expense" /></FormControl>
                            <FormLabel className="font-normal">Expense</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="income" /></FormControl>
                            <FormLabel className="font-normal">Income</FormLabel>
                        </FormItem>
                    </RadioGroup>
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

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
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {categoriesToShow.map((cat) => (
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
            </div>

            <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Source / Vendor</FormLabel>
                    <FormControl>
                    <Input placeholder="e.g. Landlord, Spotify" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
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
                name="notes"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                        <Textarea placeholder="e.g. For project X" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Active</FormLabel>
                            <FormDescription>
                                Pause to stop this item from generating transactions.
                            </FormDescription>
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />

            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {transactionToEdit ? 'Save Changes' : 'Add Recurring Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
