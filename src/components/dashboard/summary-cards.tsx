
'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useMemo } from 'react';

export function SummaryCards() {
  const { transactionsForCurrentCycle: transactions, investments, formatCurrency } = useAppContext();

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const totalInvestmentValue = useMemo(() => {
    return investments.reduce((sum, inv) => sum + inv.quantity * inv.currentPrice, 0);
  }, [investments]);

  const netWorth = balance + totalInvestmentValue;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Income</CardTitle>
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            <p className="text-xs text-muted-foreground">This cycle</p>
          </div>
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
             <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Expenses</CardTitle>
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
            <p className="text-xs text-muted-foreground">This cycle</p>
          </div>
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/50">
             <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Worth</CardTitle>
            <p className="text-xl md:text-2xl font-bold">{formatCurrency(netWorth)}</p>
            <p className="text-xs text-muted-foreground">Cash + Investments</p>
          </div>
          <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
             <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
