
'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/app-context';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Transaction } from '@/types';
import { RecurringTransactions } from '@/components/dashboard/recurring-transactions';
import { Repeat, MoreVertical, Pencil, Trash2, Leaf, Sparkles, ChevronDown, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AddTransactionDialog } from '@/components/add-transaction-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { type DateRange } from 'react-day-picker';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function TransactionsPage() {
  const { transactions, categories, deleteTransaction, formatCurrency, isPremium, allCategories } = useAppContext();

  // Dialog states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter states
  const [activeTab, setActiveTab] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');

  const activeCategories = useMemo(() => {
    return Object.entries(selectedCategories)
        .filter(([, isSelected]) => isSelected)
        .map(([category]) => category);
  }, [selectedCategories]);

  const resetFilters = () => {
    setDateRange(undefined);
    setSelectedCategories({});
    setSearchQuery('');
    setActiveTab('all');
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Tab filter (type)
      if (activeTab !== 'all' && t.type !== activeTab) return false;

      // Date range filter
      if (dateRange?.from && !dateRange.to) {
        if(new Date(t.date) < dateRange.from) return false;
      } else if (dateRange?.from && dateRange?.to) {
        if (!isWithinInterval(new Date(t.date), { start: dateRange.from, end: dateRange.to })) return false;
      }
      
      // Category filter
      if (activeCategories.length > 0 && !activeCategories.includes(t.category)) return false;
      
      // Search query filter
      const lowerCaseQuery = searchQuery.toLowerCase();
      if (searchQuery && 
          !t.source.toLowerCase().includes(lowerCaseQuery) && 
          !(t.notes && t.notes.toLowerCase().includes(lowerCaseQuery))
      ) {
        return false;
      }

      return true;
    });
  }, [transactions, activeTab, dateRange, selectedCategories, searchQuery, activeCategories]);


  const handleEdit = (transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete.id);
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };
  
  const handleDialogClose = (open: boolean) => {
      if (!open) {
          setTransactionToEdit(null);
      }
      setIsEditDialogOpen(open);
  }

  const TransactionRow = ({ transaction }: { transaction: Transaction }) => {
    const Icon = categories[transaction.category] || categories['Food'];
    const hasItems = transaction.items && transaction.items.length > 0;

    return (
      <Collapsible asChild>
        <>
        <TableRow>
          <TableCell>
            <div className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                <AvatarFallback className={cn(
                  'font-bold',
                  transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                )}>
                  <Icon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="font-medium truncate">{transaction.source}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasItems ? (
                      <Badge variant="secondary">{transaction.items!.length} items</Badge>
                  ) : (
                    <p className="hidden text-sm text-muted-foreground md:block">
                      {transaction.notes || 'No notes'}
                    </p>
                  )}
                  {isPremium && transaction.carbonFootprint && transaction.carbonFootprint > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="flex items-center gap-1 font-normal border-green-200 bg-green-50 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300">
                            <Leaf className="h-3 w-3" />
                            {transaction.carbonFootprint.toFixed(1)} kg CO₂e
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Estimated Carbon Dioxide Equivalent based on spending category.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Badge variant="outline">{transaction.category}</Badge>
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            {format(parseISO(transaction.date), 'MMMM d, yyyy')}
          </TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <p className={cn(
                'font-bold text-lg',
                transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'
              )}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </p>
              {hasItems && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-accent">
                    <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" />
                  </Button>
                </CollapsibleTrigger>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(transaction)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
        {hasItems && (
            <CollapsibleContent asChild>
                <TableRow>
                    <TableCell colSpan={4} className="p-0">
                        <div className="p-4 bg-muted/50">
                            <h4 className="font-semibold mb-2 ml-4">Itemized Details</h4>
                            <ul className="space-y-1 pl-8">
                                {transaction.items!.map(item => (
                                    <li key={item.id} className="flex justify-between text-sm text-muted-foreground">
                                        <span className="truncate pr-2">- {item.description}</span>
                                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </TableCell>
                </TableRow>
            </CollapsibleContent>
        )}
        </>
      </Collapsible>
    );
  };

  const renderTransactionTable = (filteredTransactions: Transaction[]) => {
    if (filteredTransactions.length === 0) {
        return (
            <div className="py-16 text-center text-muted-foreground">
                <p className="text-lg font-semibold">No matching transactions found.</p>
                <p>Try adjusting your filters or add a new transaction.</p>
            </div>
        )
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Details</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden sm:table-cell">Date</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} transaction={transaction} />
          ))}
        </TableBody>
      </Table>
    );
  }
  
  const RecurringTabTrigger = (
     <TabsTrigger value="recurring" disabled={!isPremium}>
        <Repeat className="mr-2 h-4 w-4" />Recurring
        {!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
      </TabsTrigger>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Transactions" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-4">
                <TabsList className="grid w-full grid-cols-4 md:w-auto">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="income">Income</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                {isPremium ? (
                    RecurringTabTrigger
                ) : (
                    <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        {RecurringTabTrigger}
                        </TooltipTrigger>
                        <TooltipContent>
                        <p>Automate your finances with Premium.</p>
                        </TooltipContent>
                    </Tooltip>
                    </TooltipProvider>
                )}
                </TabsList>
                <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                </Button>
            </div>
            
            <Collapsible open={isFilterOpen}>
                <CollapsibleContent>
                    <Card className="mt-4">
                        <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Search</label>
                                <Input placeholder="Search by source or notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date Range</label>
                                <Popover>
                                <PopoverTrigger asChild>
                                    <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                                </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Categories</label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start truncate">
                                            {activeCategories.length > 0 ? `${activeCategories.length} selected` : 'All Categories'}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                                        <DropdownMenuLabel>Filter Categories</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {allCategories.map((cat) => (
                                            <DropdownMenuCheckboxItem key={cat} checked={selectedCategories[cat] ?? false} onCheckedChange={(checked) => setSelectedCategories(prev => ({...prev, [cat]: !!checked}))}>
                                                {cat}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-end">
                                <Button variant="ghost" onClick={resetFilters} className="w-full">
                                    <X className="mr-2 h-4 w-4" /> Reset Filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </CollapsibleContent>
            </Collapsible>

            <Card className="mt-4">
              <CardContent className="p-0">
                  <TabsContent value="all" className="m-0">
                      {renderTransactionTable(filteredTransactions)}
                  </TabsContent>
                  <TabsContent value="income" className="m-0">
                      {renderTransactionTable(filteredTransactions)}
                  </TabsContent>
                  <TabsContent value="expense" className="m-0">
                      {renderTransactionTable(filteredTransactions)}
                  </TabsContent>
                  <TabsContent value="recurring" className="m-0">
                      {isPremium ? (
                        <RecurringTransactions />
                      ) : (
                        <div className="p-4">
                            <UpgradeCard 
                                title="Automate Your Finances"
                                description="Set up recurring transactions for salaries, bills, and subscriptions with Premium."
                                icon={Repeat}
                            />
                        </div>
                      )}
                  </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </main>
      </div>

      <AddTransactionDialog open={isEditDialogOpen} onOpenChange={handleDialogClose} transactionToEdit={transactionToEdit} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete this transaction from your records.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
