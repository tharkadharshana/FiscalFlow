
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { CheckSquare } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Progress } from '../ui/progress';

export function ChecklistSummary() {
  const { checklists, formatCurrency } = useAppContext();

  const { totalItems, completedItems, totalCost } = useMemo(() => {
    let tItems = 0;
    let cItems = 0;
    let tCost = 0;
    checklists.forEach(list => {
        tItems += list.items.length;
        list.items.forEach(item => {
            if (item.isCompleted) cItems++;
        });
        tCost += list.items.reduce((sum, item) => sum + item.predictedCost, 0);
    });
    return { totalItems: tItems, completedItems: cItems, totalCost: tCost };
  }, [checklists]);
  
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Checklist Progress</CardTitle>
        <CardDescription>A summary of your spending to-dos.</CardDescription>
      </CardHeader>
      <CardContent>
        {checklists.length > 0 ? (
             <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                        <span className="font-bold text-lg">{completedItems} / {totalItems} items</span>
                        <span className="text-muted-foreground text-sm">Total: {formatCurrency(totalCost)}</span>
                    </div>
                    <Progress value={progress} />
                </div>
                <Button asChild variant="outline" className="w-full mt-4">
                    <Link href="/dashboard/checklists">Manage Checklists</Link>
                </Button>
            </div>
        ) : (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                <CheckSquare className="h-10 w-10 mb-4" />
                <p className="text-sm font-semibold">No checklists created yet.</p>
                <p className="text-xs">Create a list to plan your spending.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
