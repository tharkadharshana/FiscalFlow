
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAppContext } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';

export function VatCalculator() {
  const { formatCurrency, taxRules } = useAppContext();
  const [amount, setAmount] = useState<number | string>('');
  const [calcType, setCalcType] = useState<'add' | 'remove'>('add');

  const calculation = useMemo(() => {
    if (!taxRules) return null;
    const numAmount = typeof amount === 'number' ? amount : 0;
    if (numAmount <= 0) return null;
    
    const VAT_RATE = taxRules.vatRate;

    if (calcType === 'add') {
      const vatAmount = numAmount * VAT_RATE;
      const totalAmount = numAmount + vatAmount;
      return { base: numAmount, vat: vatAmount, total: totalAmount };
    } else {
      const baseAmount = numAmount / (1 + VAT_RATE);
      const vatAmount = numAmount - baseAmount;
      return { base: baseAmount, vat: vatAmount, total: numAmount };
    }
  }, [amount, calcType, taxRules]);
  
  if (!taxRules) {
    return <Skeleton className="h-48 w-full" />;
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label>Calculation Type</Label>
          <RadioGroup defaultValue="add" onValueChange={(v) => setCalcType(v as any)} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="add" id="add-vat" />
              <Label htmlFor="add-vat">Add VAT to amount</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="remove" id="remove-vat" />
              <Label htmlFor="remove-vat">Remove VAT from amount</Label>
            </div>
          </RadioGroup>
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat-amount">Amount (LKR)</Label>
          <Input
            id="vat-amount"
            type="number"
            placeholder="e.g., 10000"
            value={amount}
            onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">VAT Calculation</h3>
            {calculation ? (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Amount:</span>
                  <span>{formatCurrency(calculation.base)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">VAT ({taxRules.vatRate * 100}%):</span>
                  <span>{formatCurrency(calculation.vat)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center font-bold text-xl text-primary">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(calculation.total)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>Enter an amount to calculate VAT.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
