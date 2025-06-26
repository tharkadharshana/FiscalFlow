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
import { defaultCategories } from '@/data/mock-data';
import { useAppContext } from '@/contexts/app-context';
import { Textarea } from './ui/textarea';
import type { Transaction } from '@/types';
import { useEffect } from 'react';

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  source: z.string().min(2, 'Source must be at least 2 characters.'),
  category: z.string({ required_error: 'Please select a category.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  paymentMethod: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type IncomeEntryFormProps = {
  onFormSubmit: () => void;
  transactionToEdit?: Transaction | null;
}

const defaultValues = {
  amount: 0,
  source: '',
  notes: '',
  date: new Date(),
  paymentMethod: '',
  invoiceNumber: '',
  category: '',
};

export function IncomeEntryForm({ onFormSubmit, transactionToEdit }: IncomeEntryFormProps) {
  const { addTransaction, updateTransaction } = useAppContext();
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
        paymentMethod: transactionToEdit.paymentMethod || '',
        invoiceNumber: transactionToEdit.invoiceNumber || '',
      });
    } else {
      form.reset(defaultValues);
    }
  }, [transactionToEdit, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const data = {
      ...values,
      type: 'income',
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
              <FormLabel>Source / Payer</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Acme Inc, Client Name" {...field} />
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
                    <SelectValue placeholder="Select an income category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {defaultCategories.filter(c => !["Groceries", "Food", "Transport", "Rent", "Clothing", "Gifts", "Entertainment", "Utilities", "Public Transport"].includes(c)).map((cat) => (
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

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="paymentMethod"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a method" />
                    </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Check">Check</SelectItem>
                        <SelectItem value="PayPal">PayPal</SelectItem>
                        <SelectItem value="Stripe">Stripe</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="invoiceNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Invoice/Ref #</FormLabel>
                <FormControl>
                    <Input placeholder="INV-12345" {...field} />
                </FormControl>
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
                <Textarea placeholder="e.g. Q2 Project Bonus" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full font-bold">{transactionToEdit ? 'Save Changes' : 'Add Income'}</Button>
      </form>
    </Form>
  );
}
