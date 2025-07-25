
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { Progress } from '../ui/progress';

export function TopCategories() {
  const { transactionsForCurrentCycle: transactions, categories, formatCurrency } = useAppContext();

  const { topCategories, totalExpenses } = useMemo(() => {
    const expenseData = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = 0;
        }
        acc[t.category] += t.amount;
        return acc;
      }, {} as Record<string, number>);

    const total = Object.values(expenseData).reduce((sum, amount) => sum + amount, 0);

    const sortedCategories = Object.entries(expenseData)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category, amount]) => ({
        name: category,
        amount: amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        icon: categories[category] || categories['Food'],
      }));

    return { topCategories: sortedCategories, totalExpenses: total };
  }, [transactions, categories]);
  
  if (topCategories.length === 0) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Top Spending Categories</CardTitle>
                <CardDescription>Your biggest expense areas this financial cycle.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-center text-muted-foreground py-8">No expenses logged this cycle.</p>
            </CardContent>
        </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Spending Categories</CardTitle>
        <CardDescription>Your biggest expense areas this financial cycle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {topCategories.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.name} className="space-y-2">
              <div className="flex items-center justify-between font-medium">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{category.name}</span>
                  </div>
                <span>{formatCurrency(category.amount)}</span>
              </div>
              <Progress value={category.percentage} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
