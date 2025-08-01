
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { Target, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

export function BudgetStatusSummary() {
  const { budgets, formatCurrency } = useAppContext();

  const { onTrack, atRisk, overspent, mostOverspent } = useMemo(() => {
    let onTrackCount = 0;
    let atRiskCount = 0;
    let overspentCount = 0;
    let mostOverspentBudget: { name: string; amount: number } | null = null;

    budgets.forEach(budget => {
      const spend = budget.currentSpend || 0;
      const progress = budget.limit > 0 ? (spend / budget.limit) * 100 : 0;

      if (progress > 100) {
        overspentCount++;
        const overAmount = spend - budget.limit;
        if (!mostOverspentBudget || overAmount > mostOverspentBudget.amount) {
          mostOverspentBudget = { name: budget.category, amount: overAmount };
        }
      } else if (progress >= 90) {
        atRiskCount++;
      } else {
        onTrackCount++;
      }
    });
    
    return { onTrack: onTrackCount, atRisk: atRiskCount, overspent: overspentCount, mostOverspent: mostOverspentBudget };
  }, [budgets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <Target /> Budget Status
        </CardTitle>
        <CardDescription>A summary of your monthly budget performance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgets.length > 0 ? (
            <>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                        <CheckCircle className="h-6 w-6 mx-auto text-green-500" />
                        <p className="text-xl font-bold">{onTrack}</p>
                        <p className="text-xs text-muted-foreground">On Track</p>
                    </div>
                    <div className="space-y-1">
                        <AlertCircle className="h-6 w-6 mx-auto text-yellow-500" />
                        <p className="text-xl font-bold">{atRisk}</p>
                        <p className="text-xs text-muted-foreground">At Risk</p>
                    </div>
                    <div className="space-y-1">
                        <TrendingDown className="h-6 w-6 mx-auto text-red-500" />
                        <p className="text-xl font-bold">{overspent}</p>
                        <p className="text-xs text-muted-foreground">Overspent</p>
                    </div>
                </div>
                {mostOverspent && (
                    <div className="text-sm text-center bg-destructive/10 text-destructive-foreground p-3 rounded-lg">
                        You're currently <span className="font-bold">{formatCurrency(mostOverspent.amount)}</span> over budget on <span className="font-bold">{mostOverspent.name}</span>.
                    </div>
                )}
            </>
        ) : (
            <div className="py-10 text-center text-muted-foreground">
                <p className="text-sm">No budgets created for this month.</p>
            </div>
        )}
      </CardContent>
      <CardFooter>
          <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard/budgets">Manage Budgets</Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
