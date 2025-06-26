
'use client';

import { useState } from 'react';
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
import { Repeat, MoreVertical, Pencil, Trash2 } from 'lucide-react';
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

export default function TransactionsPage() {
  const { transactions, categories, deleteTransaction, formatCurrency } = useAppContext();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

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
    return (
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
              <p className="hidden text-sm text-muted-foreground truncate md:block">
                {transaction.notes || 'No notes'}
              </p>
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
          <div className="flex items-center justify-end gap-2">
            <p className={cn(
              'font-bold text-lg',
              transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'
            )}>
              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
            </p>
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
    );
  };

  const renderTransactionTable = (filteredTransactions: Transaction[]) => {
    if (filteredTransactions.length === 0) {
        return (
            <div className="py-16 text-center text-muted-foreground">
                <p className="text-lg font-semibold">No transactions found.</p>
                <p>Add a new transaction to get started.</p>
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

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Transactions" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="all">
            <TabsList className="grid w-full grid-cols-4 md:w-[500px]">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="income">Income</TabsTrigger>
              <TabsTrigger value="expense">Expenses</TabsTrigger>
              <TabsTrigger value="recurring"><Repeat className="mr-2 h-4 w-4" />Recurring</TabsTrigger>
            </TabsList>
            <Card className="mt-4">
              <CardContent className="p-0">
                  <TabsContent value="all" className="m-0">
                      {renderTransactionTable(transactions)}
                  </TabsContent>
                  <TabsContent value="income" className="m-0">
                      {renderTransactionTable(transactions.filter(t => t.type === 'income'))}
                  </TabsContent>
                  <TabsContent value="expense" className="m-0">
                      {renderTransactionTable(transactions.filter(t => t.type === 'expense'))}
                  </TabsContent>
                  <TabsContent value="recurring" className="m-0">
                      <RecurringTransactions />
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
