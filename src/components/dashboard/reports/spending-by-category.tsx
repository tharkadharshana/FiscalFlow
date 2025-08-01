
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/contexts/app-context';
import type { Transaction } from '@/types';

type Props = {
  data: {
    transactions: Transaction[];
    totalExpenses: number;
  };
};

export function SpendingByCategory({ data }: Props) {
  const { formatCurrency, categories: categoryIcons } = useAppContext();

  const categorySpend = useMemo(() => {
    if (data.totalExpenses === 0) return [];

    const spendMap = data.transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(spendMap)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / data.totalExpenses) * 100,
        icon: categoryIcons[category] || categoryIcons['Food'],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data.transactions, data.totalExpenses, categoryIcons]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>A breakdown of your expenses for the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        {categorySpend.length > 0 ? (
          <div className="space-y-4">
            {categorySpend.map(({ category, amount, percentage, icon: Icon }) => (
              <div key={category} className="space-y-1">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground"/>{category}</span>
                  <span className="font-mono">{formatCurrency(amount)}</span>
                </div>
                <Progress value={percentage} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>No expenses recorded for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
