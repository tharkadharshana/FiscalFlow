
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
import { CalendarIcon, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { Textarea } from './ui/textarea';
import type { Transaction } from '@/types';
import { useEffect } from 'react';
import { Switch } from './ui/switch';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  source: z.string().min(2, 'Source must be at least 2 characters.'),
  category: z.string({ required_error: 'Please select a category.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  paymentMethod: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
  isTaxDeductible: z.boolean().optional(),
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
  isTaxDeductible: false,
};

export function IncomeEntryForm({ onFormSubmit, transactionToEdit }: IncomeEntryFormProps) {
  const { addTransaction, updateTransaction, incomeCategories, isPremium, deductibleTransactionsCount } = useAppContext();
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
        isTaxDeductible: transactionToEdit.isTaxDeductible || false,
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

  const canFlagAsDeductible = isPremium || deductibleTransactionsCount < FREE_TIER_LIMITS.taxDeductibleFlags;

  const TaxDeductibleSwitch = (
    <FormField
      control={form.control}
      name="isTaxDeductible"
      render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                  <FormLabel className="text-base flex items-center gap-2">
                      Taxable Income
                      {!isPremium && <Sparkles className="h-4 w-4 text-amber-500" />}
                  </FormLabel>
                  <FormDescription>Mark this if this income is part of your taxable earnings.</FormDescription>
              </div>
              <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!field.value && !canFlagAsDeductible} />
              </FormControl>
          </FormItem>
      )}
    />
  );

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
                  {incomeCategories.map((cat) => (
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

        {canFlagAsDeductible ? TaxDeductibleSwitch : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>{TaxDeductibleSwitch}</div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Free users can flag {FREE_TIER_LIMITS.taxDeductibleFlags} items per month. Upgrade for unlimited.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

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
