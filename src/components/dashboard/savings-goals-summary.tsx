
'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { PiggyBank, Star } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Progress } from '../ui/progress';

export function SavingsGoalsSummary() {
  const { savingsGoals, formatCurrency } = useAppContext();

  const topGoal = useMemo(() => {
    if (savingsGoals.length === 0) return null;
    // Prioritize the goal with the highest progress percentage
    return [...savingsGoals].sort((a, b) => {
        const progressA = a.targetAmount > 0 ? (a.currentAmount / a.targetAmount) : 0;
        const progressB = b.targetAmount > 0 ? (b.currentAmount / b.targetAmount) : 0;
        return progressB - progressA;
    })[0];
  }, [savingsGoals]);

  const totalSaved = useMemo(() => {
      return savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  }, [savingsGoals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2"><PiggyBank /> Savings Goals</CardTitle>
        <CardDescription>Your progress towards your top savings goals.</CardDescription>
      </CardHeader>
      <CardContent>
        {topGoal ? (
             <div className="space-y-4">
                <div className="font-bold text-center text-lg">Total Saved: {formatCurrency(totalSaved)}</div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold truncate pr-2">{topGoal.title}</p>
                        <p className="text-sm text-muted-foreground">{((topGoal.currentAmount / topGoal.targetAmount) * 100).toFixed(0)}%</p>
                    </div>
                    <Progress value={(topGoal.currentAmount / topGoal.targetAmount) * 100} />
                    <p className="text-sm text-right text-muted-foreground">
                        {formatCurrency(topGoal.currentAmount)} / {formatCurrency(topGoal.targetAmount)}
                    </p>
                </div>
            </div>
        ) : (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                <Star className="h-10 w-10 mb-4" />
                <p className="text-sm font-semibold">No savings goals yet.</p>
                <p className="text-xs">Create a goal to start saving for something amazing.</p>
            </div>
        )}
      </CardContent>
       <CardFooter>
          <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/savings">Manage Savings Goals</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
