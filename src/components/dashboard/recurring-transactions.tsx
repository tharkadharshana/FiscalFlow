
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-context';
import { PlusCircle, Repeat, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { AddRecurringTransactionDialog } from './add-recurring-transaction-dialog';
import type { RecurringTransaction } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

type SortDescriptor = {
  column: 'title' | 'amount' | 'category' | 'frequency';
  direction: 'ascending' | 'descending';
};

type RecurringTransactionsProps = {
  filterValue: string;
  sortDescriptor: SortDescriptor;
};

export function RecurringTransactions({ filterValue, sortDescriptor }: RecurringTransactionsProps) {
  const { recurringTransactions, deleteRecurringTransaction, formatCurrency, isPremium, FREE_TIER_LIMITS } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<RecurringTransaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<RecurringTransaction | null>(null);
  
  const handleEdit = (transaction: RecurringTransaction) => {
    setTransactionToEdit(transaction);
    setIsDialogOpen(true);
  }

  const handleDelete = (transaction: RecurringTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteRecurringTransaction(transactionToDelete.id);
      setIsDeleteAlertOpen(false);
      setTransactionToDelete(null);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setTransactionToEdit(null);
    }
    setIsDialogOpen(open);
  }

  const filteredItems = useMemo(() => {
    return recurringTransactions.filter(t => 
        t.title.toLowerCase().includes(filterValue.toLowerCase()) ||
        t.source.toLowerCase().includes(filterValue.toLowerCase())
    );
  }, [recurringTransactions, filterValue]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
        const first = sortDescriptor.direction === 'ascending' ? a : b;
        const second = sortDescriptor.direction === 'ascending' ? b : a;

        switch(sortDescriptor.column) {
            case 'amount': return first.amount - second.amount;
            case 'category': return first.category.localeCompare(second.category);
            case 'frequency': return first.frequency.localeCompare(second.frequency);
            default: return first.title.localeCompare(second.title);
        }
    });
  }, [filteredItems, sortDescriptor]);

  const canAddRecurring = isPremium || recurringTransactions.length < FREE_TIER_LIMITS.recurringTransactions;

  const AddRecurringButton = (
    <Button onClick={() => setIsDialogOpen(true)} disabled={!canAddRecurring}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Recurring
    </Button>
  );

  const RecurringTransactionCard = ({ transaction }: { transaction: RecurringTransaction }) => {
    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
            <div className="space-y-1">
                <CardTitle className="text-lg">{transaction.title}</CardTitle>
                <CardDescription>
                    {formatCurrency(transaction.amount)} every {transaction.frequency.replace(/^\w/, c => c.toUpperCase())}
                </CardDescription>
            </div>
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
        </CardHeader>
        <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={cn(transaction.type === 'income' && 'bg-green-600 hover:bg-green-700')}>
                        {transaction.type}
                    </Badge>
                    <Badge variant="outline">{transaction.category}</Badge>
                </div>
                <Badge variant={transaction.isActive ? 'default' : 'destructive'}>
                    {transaction.isActive ? 'Active' : 'Paused'}
                </Badge>
            </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recurring Transactions</CardTitle>
          <CardDescription>
            Manage automatic income and expenses like salaries and subscriptions.
          </CardDescription>
        </div>
        {canAddRecurring ? AddRecurringButton : (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {AddRecurringButton}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Upgrade to Premium for more recurring transactions.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )}
      </CardHeader>
      <CardContent>
        {sortedItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedItems.map((transaction) => (
              <RecurringTransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
            <Repeat className="h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No matching recurring transactions found.</p>
            <p>Try clearing your filters or add a new recurring item.</p>
          </div>
        )}
      </CardContent>

      <AddRecurringTransactionDialog open={isDialogOpen} onOpenChange={handleDialogClose} transactionToEdit={transactionToEdit} />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the recurring transaction for {'"'}
                {transactionToDelete?.title}{'"'}.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
