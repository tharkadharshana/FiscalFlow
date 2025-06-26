'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, parseISO } from 'date-fns';
import { Button } from '../ui/button';
import Link from 'next/link';

export function RecentTransactions() {
  const { transactions } = useAppContext();
  const recentTransactions = transactions.slice(0, 5);
  
  const formatCurrency = (amount: number, type: 'income' | 'expense') => {
    const value = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
    return type === 'income' ? `+${value}` : `-${value}`;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Recent Transactions</CardTitle>
        <CardDescription>Your latest income and expenses.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentTransactions.map((transaction) => {
            const Icon = transaction.icon;
            return (
              <div key={transaction.id} className="flex items-center gap-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className={transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}>
                    <Icon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium truncate">{transaction.source}</p>
                  {transaction.notes && (
                    <p className="text-sm text-muted-foreground truncate">
                      {transaction.notes}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(transaction.date), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'}`}>
                    {formatCurrency(transaction.amount, transaction.type)}
                </div>
              </div>
            );
          })}
        </div>
        {transactions.length > 5 && (
            <Button variant="outline" asChild className="mt-6 w-full">
                <Link href="/dashboard/transactions">View All Transactions</Link>
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
