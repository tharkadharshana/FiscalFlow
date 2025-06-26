'use client';

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

export default function TransactionsPage() {
  const { transactions, categories } = useAppContext();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

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
          <p className={cn(
            'font-bold text-lg',
            transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'
          )}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
          </p>
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
    <div className="flex flex-1 flex-col">
      <Header title="Transactions" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expense">Expenses</TabsTrigger>
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
            </CardContent>
          </Card>
        </Tabs>
      </main>
    </div>
  );
}
