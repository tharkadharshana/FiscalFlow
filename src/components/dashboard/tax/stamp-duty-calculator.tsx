
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';

export function StampDutyCalculator() {
  const { formatCurrency, taxRules } = useAppContext();
  const [leaseAmount, setLeaseAmount] = useState<number | string>('');

  const calculation = useMemo(() => {
    if (!taxRules) return null;
    const amount = typeof leaseAmount === 'number' ? leaseAmount : 0;
    if (amount <= 0) return null;
    const stampDuty = amount * taxRules.stampDutyRate;
    return { stampDuty };
  }, [leaseAmount, taxRules]);

  if (!taxRules) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="lease-amount">Total Lease / Hire Value (LKR)</Label>
          <Input
            id="lease-amount"
            type="number"
            placeholder="e.g., 1200000"
            value={leaseAmount}
            onChange={(e) => setLeaseAmount(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Stamp Duty Calculation</h3>
            {calculation ? (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Lease Value:</span>
                  <span>{formatCurrency(typeof leaseAmount === 'number' ? leaseAmount : 0)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold text-xl text-primary">
                  <span>Stamp Duty ({taxRules.stampDutyRate * 100}%):</span>
                  <span>{formatCurrency(calculation.stampDuty)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>Enter a lease value to calculate stamp duty.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
