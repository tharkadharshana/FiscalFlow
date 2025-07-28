

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
import { CalendarIcon, Sparkles, Rocket } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { Textarea } from './ui/textarea';
import { useMemo, useEffect } from 'react';
import type { Transaction, ChecklistItem } from '@/types';
import { Switch } from './ui/switch';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, 'Amount must be greater than 0.'),
  source: z.string().min(2, 'Source must be at least 2 characters.'),
  category: z.string({ required_error: 'Please select a category.' }),
  date: z.date({ required_error: 'Please select a date.' }),
  notes: z.string().optional(),
  tripId: z.string().optional(),
  tripItemId: z.string().optional(),
  isTaxDeductible: z.boolean().optional(),
  checklistId: z.string().optional(),
  checklistItemId: z.string().optional(),
});

type ManualEntryFormProps = {
  onFormSubmit: () => void;
  transactionToEdit?: Transaction | null;
  itemToConvert?: { checklistId: string; item: ChecklistItem } | null;
}

const defaultValues = {
  amount: 0,
  source: '',
  notes: '',
  date: new Date(),
  category: '',
  tripId: undefined,
  tripItemId: undefined,
  isTaxDeductible: false,
  checklistId: undefined,
  checklistItemId: undefined,
};

export function ManualEntryForm({ onFormSubmit, transactionToEdit, itemToConvert }: ManualEntryFormProps) {
  const { userProfile, addTransaction, updateTransaction, tripPlans = [], expenseCategories, isPremium, deductibleTransactionsCount } = useAppContext();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues,
  });
  
  const activeTrip = useMemo(() => {
    if (!userProfile?.activeTripId) return null;
    return tripPlans.find(trip => trip.id === userProfile.activeTripId);
  }, [userProfile, tripPlans]);

  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...defaultValues,
        ...transactionToEdit,
        date: parseISO(transactionToEdit.date),
      });
    } else if (itemToConvert) {
        form.reset({
            ...defaultValues,
            amount: itemToConvert.item.predictedCost,
            source: itemToConvert.item.description,
            category: itemToConvert.item.category,
            checklistId: itemToConvert.checklistId,
            checklistItemId: itemToConvert.item.id,
        });
    } else {
      form.reset({
        ...defaultValues,
      });
    }
  }, [transactionToEdit, itemToConvert, form]);

  // Effect to specifically handle setting the active trip ID
  useEffect(() => {
    if (!transactionToEdit && !itemToConvert) {
        form.setValue('tripId', activeTrip?.id);
    }
  }, [activeTrip, transactionToEdit, itemToConvert, form]);


  const selectedTripId = form.watch('tripId');

  const selectedTripItems = useMemo(() => {
    if (!selectedTripId) return [];
    const trip = tripPlans.find(p => p.id === selectedTripId);
    return trip?.items || [];
  }, [selectedTripId, tripPlans]);

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

  const canFlagAsDeductible = isPremium || deductibleTransactionsCount < FREE_TIER_LIMITS.taxDeductibleFlags;

  const TaxDeductibleSwitch = (
      <FormField
        control={form.control}
        name="isTaxDeductible"
        render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">
                        Tax Deductible
                        {!isPremium && <Sparkles className="h-4 w-4 text-amber-500" />}
                    </FormLabel>
                    <FormDescription>Mark this if it's a business or other tax-deductible expense.</FormDescription>
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
        {activeTrip && !transactionToEdit && (
            <Alert>
                <Rocket className="h-4 w-4" />
                <AlertTitle>Trip Mode Active</AlertTitle>
                <AlertDescription>
                    This expense will be automatically linked to your trip: <span className="font-semibold">{activeTrip.title}</span>.
                </AlertDescription>
            </Alert>
        )}
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
            <h3 className="text-sm font-medium text-muted-foreground">Link to Trip (Optional)</h3>
            <FormField
                control={form.control}
                name="tripId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Trip Plan</FormLabel>
                        <Select 
                            onValueChange={(value) => {
                                field.onChange(value === 'none' ? undefined : value);
                                form.setValue('tripItemId', undefined); // Reset item when plan changes
                            }} 
                            value={field.value || 'none'}
                            disabled={!!activeTrip && !transactionToEdit}
                        >
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a trip to link this expense to" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {tripPlans.filter(p => p.status === 'active' || p.status === 'planning').map((trip) => (
                                    <SelectItem key={trip.id} value={trip.id}>
                                    {trip.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            {selectedTripId && (
                <FormField
                    control={form.control}
                    name="tripItemId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Trip Item</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger disabled={!selectedTripId}>
                                        <SelectValue placeholder="Select a trip item" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {selectedTripItems.map((item) => (
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
                <Textarea placeholder="e.g. Coffee with friends" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full font-bold">{transactionToEdit || itemToConvert ? 'Save Changes' : 'Add Expense'}</Button>
      </form>
    </Form>
  );
}
