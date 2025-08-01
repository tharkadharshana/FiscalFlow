
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/contexts/app-context';
import type { Budget } from '@/types';
import { cn } from '@/lib/utils';
import { Target } from 'lucide-react';

type Props = {
  data: {
    budgets: Budget[];
  };
};

export function BudgetPerformance({ data }: Props) {
  const { formatCurrency, categories: categoryIcons } = useAppContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs. Actuals</CardTitle>
        <CardDescription>How your spending compares to your budget for the month.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.budgets.length > 0 ? (
          <div className="space-y-4">
            {data.budgets.map((budget) => {
              const spent = budget.currentSpend;
              const limit = budget.limit;
              const progress = limit > 0 ? (spent / limit) * 100 : 0;
              const difference = limit - spent;
              const Icon = categoryIcons[budget.category] || Target;

              return (
                <div key={budget.id} className="space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{budget.category}</span>
                    <span className={cn(difference < 0 && 'text-destructive')}>{formatCurrency(difference)}</span>
                  </div>
                  <Progress value={progress} className={cn(progress > 100 && '[&>div]:bg-destructive')} />
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Spent: {formatCurrency(spent)}</span>
                    <span>Budget: {formatCurrency(limit)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-10">
            <p>No budgets set for this period.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
