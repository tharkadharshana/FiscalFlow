

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/app-context';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Transaction } from '@/types';
import { RecurringTransactions } from '@/components/dashboard/recurring-transactions';
import { Repeat, MoreVertical, Pencil, Trash2, Sparkles, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';

type SortDescriptor = {
  column: 'date' | 'amount' | 'source';
  direction: 'ascending' | 'descending';
};

const ITEMS_PER_PAGE = 20;

const TransactionTableControls = ({
    filterValue,
    onFilterChange,
    sortDescriptor,
    onSortChange,
}: {
    filterValue: string;
    onFilterChange: (value: string) => void;
    sortDescriptor: SortDescriptor;
    onSortChange: (descriptor: SortDescriptor) => void;
}) => (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b">
        <div className="relative w-full md:w-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Filter by source or category..." className="pl-8 sm:w-[300px]" value={filterValue} onChange={(e) => onFilterChange(e.target.value)} />
        </div>
        <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline"><ArrowUpDown className="mr-2 h-4 w-4" />Sort by</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSortChange({ column: 'date', direction: 'descending' })}>Newest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange({ column: 'date', direction: 'ascending' })}>Oldest First</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange({ column: 'amount', direction: 'descending' })}>Amount: High-Low</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange({ column: 'amount', direction: 'ascending' })}>Amount: Low-High</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange({ column: 'source', direction: 'ascending' })}>Source (A-Z)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onSortChange({ column: 'source', direction: 'descending' })}>Source (Z-A)</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
);

export default function TransactionsPage() {
  const { transactions, categories, deleteTransaction, formatCurrency, isPremium } = useAppContext();

  // State for Dialogs
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  // State for Table Controls
  const [activeTab, setActiveTab] = useState('all');
  const [filterValue, setFilterValue] = useState('');
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({ column: 'date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  
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
      if (!open) setTransactionToEdit(null);
      setIsEditDialogOpen(open);
  }

  // Memoized data processing
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    if (activeTab !== 'all') {
      filtered = filtered.filter(t => t.type === activeTab);
    }

    if (filterValue) {
      filtered = filtered.filter(t => 
          t.source.toLowerCase().includes(filterValue.toLowerCase()) || 
          t.category.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    return filtered;
  }, [transactions, activeTab, filterValue]);

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
        const first = sortDescriptor.direction === 'ascending' ? a : b;
        const second = sortDescriptor.direction === 'ascending' ? b : a;

        switch (sortDescriptor.column) {
            case 'date':
                return new Date(first.date).getTime() - new Date(second.date).getTime();
            case 'amount':
                return first.amount - second.amount;
            case 'source':
                return first.source.localeCompare(second.source);
            default:
                return 0;
        }
    });
  }, [filteredTransactions, sortDescriptor]);
  
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sortedTransactions.slice(start, end);
  }, [sortedTransactions, currentPage]);

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

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
                <AvatarFallback className={cn('font-bold', transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600')}>
                  <Icon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="font-medium truncate">{transaction.source}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {hasItems ? (
                      <Badge variant="secondary">{transaction.items!.length} items</Badge>
                  ) : (
                    <p className="hidden text-sm text-muted-foreground md:block">{transaction.notes || 'No notes'}</p>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
          <TableCell className="hidden md:table-cell"><Badge variant="outline">{transaction.category}</Badge></TableCell>
          <TableCell className="hidden sm:table-cell">{format(parseISO(transaction.date), 'MMMM d, yyyy')}</TableCell>
          <TableCell className="text-right">
            <div className="flex items-center justify-end gap-1">
              <p className={cn('font-bold text-lg', transaction.type === 'income' ? 'text-green-600' : 'text-slate-800')}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </p>
              {hasItems && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-accent"><ChevronDown className="h-4 w-4 transition-transform data-[state=open]:rotate-180" /></Button>
                </CollapsibleTrigger>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(transaction)}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDelete(transaction)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </TableCell>
        </TableRow>
        {hasItems && (
            <CollapsibleContent asChild>
                <TableRow><TableCell colSpan={4} className="p-0"><div className="p-4 bg-muted/50"><h4 className="font-semibold mb-2 ml-4">Itemized Details</h4><ul className="space-y-1 pl-8">
                    {transaction.items!.map(item => (<li key={item.id} className="flex justify-between text-sm text-muted-foreground"><span>- {item.description}</span><span className="font-mono">{formatCurrency(item.amount)}</span></li>))}
                </ul></div></TableCell></TableRow>
            </CollapsibleContent>
        )}
        </>
      </Collapsible>
    );
  };

  const renderTransactionTable = (txs: Transaction[]) => {
    if (txs.length === 0) return (<div className="py-16 text-center text-muted-foreground"><p className="text-lg font-semibold">No transactions found.</p><p>Try adjusting your filters or add a new transaction.</p></div>)
    return (<Table><TableHeader><TableRow><TableHead>Details</TableHead><TableHead className="hidden md:table-cell">Category</TableHead><TableHead className="hidden sm:table-cell">Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{txs.map((transaction) => (<TransactionRow key={transaction.id} transaction={transaction} />))}</TableBody></Table>)
  }
  
  const RecurringTabTrigger = (<TabsTrigger value="recurring" disabled={!isPremium}><Repeat className="mr-2 h-4 w-4" />Recurring{!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}</TabsTrigger>);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Transactions" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="all" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 md:w-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              {isPremium ? RecurringTabTrigger : (<TooltipProvider><Tooltip><TooltipTrigger asChild>{RecurringTabTrigger}</TooltipTrigger><TooltipContent><p>Automate your finances with Premium.</p></TooltipContent></Tooltip></TooltipProvider>)}
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
                <Card>
                    <TransactionTableControls filterValue={filterValue} onFilterChange={setFilterValue} sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor} />
                    <CardContent className="p-0">{renderTransactionTable(paginatedTransactions)}</CardContent>
                    <div className="flex items-center justify-between p-4 border-t">
                        <div className="text-sm text-muted-foreground">Showing <strong>{paginatedTransactions.length}</strong> of <strong>{sortedTransactions.length}</strong> transactions.</div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="icon" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </Card>
            </TabsContent>
            <TabsContent value="income" className="mt-4">
                <Card>
                    <TransactionTableControls filterValue={filterValue} onFilterChange={setFilterValue} sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor} />
                    <CardContent className="p-0">{renderTransactionTable(paginatedTransactions)}</CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="expense" className="mt-4">
                 <Card>
                    <TransactionTableControls filterValue={filterValue} onFilterChange={setFilterValue} sortDescriptor={sortDescriptor} onSortChange={setSortDescriptor} />
                    <CardContent className="p-0">{renderTransactionTable(paginatedTransactions)}</CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="recurring" className="mt-4">
               <RecurringTransactions />
            </TabsContent>
          </Tabs>
        </main>
      </div>
      <AddTransactionDialog open={isEditDialogOpen} onOpenChange={handleDialogClose} transactionToEdit={transactionToEdit} />
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete this transaction from your records.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
