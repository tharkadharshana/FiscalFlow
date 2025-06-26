
'use client';

import { useState } from 'react';
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
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function RecurringTransactions() {
  const { recurringTransactions, deleteRecurringTransaction } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<RecurringTransaction | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<RecurringTransaction | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
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
        <Button onClick={() => setIsDialogOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Recurring
        </Button>
      </CardHeader>
      <CardContent>
        {recurringTransactions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recurringTransactions.map((transaction) => (
              <RecurringTransactionCard key={transaction.id} transaction={transaction} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
            <Repeat className="h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No recurring transactions set up yet.</p>
            <p>Click "Add Recurring" to schedule a regular income or expense.</p>
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
