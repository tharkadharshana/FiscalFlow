
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export function IncomeTaxCalculator() {
  const [annualIncome, setAnnualIncome] = useState<number | string>('');

  const formatCurrency = (amount: number, currency = 'LKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const taxCalculation = useMemo(() => {
    const income = typeof annualIncome === 'number' ? annualIncome : 0;
    if (income <= 0) return null;

    // Simplified progressive tax brackets for Sri Lanka (for demonstration)
    const brackets = [
      { limit: 1_200_000, rate: 0 },
      { limit: 1_700_000, rate: 0.06 },
      { limit: 2_200_000, rate: 0.12 },
      { limit: 2_700_000, rate: 0.18 },
      { limit: 3_200_000, rate: 0.24 },
      { limit: 3_700_000, rate: 0.30 },
      { limit: Infinity, rate: 0.36 },
    ];

    let remainingIncome = income;
    let totalTax = 0;
    let previousLimit = 0;

    for (const bracket of brackets) {
      if (remainingIncome <= 0) break;
      const taxableInBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
      if(taxableInBracket < 0) continue;
      
      totalTax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
      previousLimit = bracket.limit;
    }
    
    const effectiveRate = (totalTax / income) * 100;
    const netIncome = income - totalTax;

    return { totalTax, netIncome, effectiveRate };
  }, [annualIncome]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="annual-income">Annual Gross Income (LKR)</Label>
          <Input
            id="annual-income"
            type="number"
            placeholder="e.g., 2500000"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Estimated Tax Liability</h3>
            {taxCalculation ? (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-primary font-bold text-xl">
                  <span>Total Tax Due:</span>
                  <span>{formatCurrency(taxCalculation.totalTax)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Net Income (After Tax):</span>
                  <span>{formatCurrency(taxCalculation.netIncome)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Effective Tax Rate:</span>
                  <span>{taxCalculation.effectiveRate.toFixed(2)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>Enter your annual income to estimate your tax.</p>
              </div>
            )}
             <Alert className="text-xs">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Calculations are based on the progressive PAYE tax brackets for Sri Lanka. This is for estimation purposes only.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
