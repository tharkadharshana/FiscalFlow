

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
import { Repeat, MoreVertical, Pencil, Trash2, Sparkles, ChevronDown } from 'lucide-react';
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
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function TransactionsPage() {
  const { transactions, categories, deleteTransaction, formatCurrency, isPremium } = useAppContext();

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
                                        <span>- {item.description}</span>
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
          <Tabs defaultValue="all">
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
