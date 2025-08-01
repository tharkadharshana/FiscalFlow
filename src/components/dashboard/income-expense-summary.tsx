
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

export function IncomeExpenseSummary() {
  const { transactionsForCurrentCycle, formatCurrency } = useAppContext();

  const { totalIncome, totalExpenses } = useMemo(() => {
    const income = transactionsForCurrentCycle
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const expenses = transactionsForCurrentCycle
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
    return { totalIncome: income, totalExpenses: expenses };
  }, [transactionsForCurrentCycle]);
  
  const expensePercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const balance = totalIncome - totalExpenses;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><Scale /> Income vs. Expense</CardTitle>
        <CardDescription>Your cash flow for the current financial cycle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <div className="flex justify-between font-mono text-sm">
                <span className="flex items-center gap-1.5"><TrendingDown className="text-red-500" />Expenses</span>
                <span className="flex items-center gap-1.5">Income<TrendingUp className="text-green-500" /></span>
            </div>
            <Progress value={expensePercentage} />
            <div className="flex justify-between font-mono text-sm font-bold">
                <span>{formatCurrency(totalExpenses)}</span>
                <span>{formatCurrency(totalIncome)}</span>
            </div>
        </div>
        <div className={cn("text-center p-3 rounded-lg font-bold", balance >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800" )}>
            {balance >= 0 ? `Net Gain: ${formatCurrency(balance)}` : `Net Loss: ${formatCurrency(balance)}`}
        </div>
      </CardContent>
    </Card>
  );
}
