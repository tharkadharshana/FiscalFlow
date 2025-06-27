
'use client';

import { useEffect, useState } from 'react';
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
import type { Investment } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { CoinGeckoMarketData, getCoinGeckoMarketData } from '@/lib/actions';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import Image from 'next/image';

const formSchema = z.object({
  name: z.string().min(2, 'Asset name is required.'),
  symbol: z.string().min(1, 'Symbol/Ticker is required.').toUpperCase(),
  assetType: z.enum(['Stock', 'ETF', 'Crypto', 'Mutual Fund', 'Other']),
  quantity: z.coerce.number().min(0, "Quantity can't be negative."),
  purchasePrice: z.coerce.number().min(0, "Purchase price can't be negative."),
  currentPrice: z.coerce.number().min(0, "Current price can't be negative."),
  purchaseDate: z.date(),
  coinGeckoId: z.string().optional(),
});

type AddInvestmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentToEdit?: Investment | null;
};

export function AddInvestmentDialog({ open, onOpenChange, investmentToEdit }: AddInvestmentDialogProps) {
  const { addInvestment, updateInvestment, showNotification } = useAppContext();
  const [isCryptoListLoading, setIsCryptoListLoading] = useState(false);
  const [cryptoList, setCryptoList] = useState<CoinGeckoMarketData[]>([]);
  const [isComboboxOpen, setIsComboboxOpen] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      symbol: '',
      assetType: 'Stock',
      quantity: 0,
      purchasePrice: 0,
      currentPrice: 0,
      purchaseDate: new Date(),
      coinGeckoId: undefined,
    },
  });
  
  const assetType = form.watch('assetType');

  useEffect(() => {
    if (assetType === 'Crypto' && cryptoList.length === 0) {
      setIsCryptoListLoading(true);
      getCoinGeckoMarketData()
        .then(data => {
            if ('error' in data) {
                showNotification({type: 'error', title: 'Could not fetch crypto list', description: data.error});
            } else {
                setCryptoList(data);
            }
        })
        .finally(() => setIsCryptoListLoading(false));
    }
  }, [assetType, cryptoList.length, showNotification]);

  useEffect(() => {
    if (investmentToEdit) {
      form.reset({
        ...investmentToEdit,
        purchaseDate: parseISO(investmentToEdit.purchaseDate),
      });
    } else {
      form.reset({
        name: '',
        symbol: '',
        assetType: 'Stock',
        quantity: 0,
        purchasePrice: 0,
        currentPrice: 0,
        purchaseDate: new Date(),
        coinGeckoId: undefined,
      });
    }
  }, [investmentToEdit, form, open]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const dataToSave = {
        ...values,
        purchaseDate: values.purchaseDate.toISOString(),
    }
    if (investmentToEdit) {
      await updateInvestment(investmentToEdit.id, dataToSave);
    } else {
      await addInvestment(dataToSave);
    }
    onOpenChange(false);
  }

  const CryptoSelector = (
    <div className="space-y-2 col-span-2">
        <FormLabel>Cryptocurrency</FormLabel>
        <Popover open={isComboboxOpen} onOpenChange={setIsComboboxOpen}>
            <PopoverTrigger asChild>
                <FormControl>
                    <Button
                        variant="outline"
                        role="combobox"
                        className={cn("w-full justify-between", !form.getValues('name') && "text-muted-foreground")}
                    >
                        {isCryptoListLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : null}
                        {form.getValues('name') ? cryptoList.find(c => c.name === form.getValues('name'))?.name : "Select a cryptocurrency"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                    <CommandInput placeholder="Search coins..." />
                    <CommandList>
                        <CommandEmpty>No cryptocurrency found.</CommandEmpty>
                        <CommandGroup>
                            {cryptoList.map((coin) => (
                                <CommandItem
                                    value={coin.name}
                                    key={coin.id}
                                    onSelect={() => {
                                        form.setValue('name', coin.name);
                                        form.setValue('symbol', coin.symbol.toUpperCase());
                                        form.setValue('currentPrice', coin.current_price);
                                        form.setValue('coinGeckoId', coin.id);
                                        setIsComboboxOpen(false);
                                    }}
                                    className="flex items-center gap-2"
                                >
                                    <Image src={coin.image} alt={coin.name} width={20} height={20} />
                                    {coin.name} ({coin.symbol.toUpperCase()})
                                    <Check className={cn("ml-auto h-4 w-4", coin.name === form.getValues('name') ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
        <FormMessage />
    </div>
  );

  const StockSelector = (
    <>
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Asset Name</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. Apple Inc." {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="symbol"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Symbol / Ticker</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g. AAPL" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{investmentToEdit ? 'Edit' : 'Add'} Investment</DialogTitle>
          <DialogDescription>
            Manually add an asset to your portfolio. Update the current price periodically to track performance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
            
            <div className="grid grid-cols-2 gap-4">
                {assetType === 'Crypto' ? CryptoSelector : StockSelector}
            </div>

            <FormField
                control={form.control}
                name="assetType"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Reset fields when type changes
                        form.setValue('name', '');
                        form.setValue('symbol', '');
                        form.setValue('coinGeckoId', undefined);
                    }} value={field.value}>
                    <FormControl>
                        <SelectTrigger>
                        <SelectValue placeholder="Select asset type" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Stock">Stock</SelectItem>
                        <SelectItem value="ETF">ETF</SelectItem>
                        <SelectItem value="Crypto">Crypto</SelectItem>
                        <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="10" {...field} step="any"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Purchase Date</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                >
                                    {field.value ? (format(field.value, "PPP")) : (<span>Pick a date</span>)}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="purchasePrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Avg. Purchase Price</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="150.00" {...field} step="any"/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="currentPrice"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Current Market Price</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="175.00" {...field} step="any" readOnly={assetType === 'Crypto'}/>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>


            <DialogFooter className="pt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {investmentToEdit ? 'Save Changes' : 'Add Investment'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
