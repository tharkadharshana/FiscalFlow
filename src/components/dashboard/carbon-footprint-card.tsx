'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Leaf, Info } from 'lucide-react';
import { isSameMonth } from 'date-fns';

export function CarbonFootprintCard() {
  const { transactions } = useAppContext();

  const totalCarbonFootprint = useMemo(() => {
    const now = new Date();
    return transactions
      .filter(t => t.type === 'expense' && isSameMonth(new Date(t.date), now) && t.carbonFootprint)
      .reduce((sum, t) => sum + (t.carbonFootprint || 0), 0);
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Carbon Footprint</CardTitle>
        <CardDescription>An estimate of your spending's environmental impact.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                <Leaf className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
                <p className="text-2xl font-bold">{totalCarbonFootprint.toFixed(1)} kg CO₂e</p>
                <p className="text-sm text-muted-foreground">This month's estimate</p>
            </div>
        </div>
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>This is an illustrative estimate. Actual carbon footprints vary based on specific products and services.</span>
        </div>
      </CardContent>
    </Card>
  );
}
