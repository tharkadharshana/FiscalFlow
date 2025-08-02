
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CostBreakdownCalculator() {
  const { formatCurrency } = useAppContext();
  const [totalPrice, setTotalPrice] = useState<number | string>('');
  const [tariff, setTariff] = useState<number | string>('');
  const [vat, setVat] = useState<number | string>('');

  const calculation = useMemo(() => {
    const P = typeof totalPrice === 'number' ? totalPrice : 0;
    const T = typeof tariff === 'number' ? tariff : 0;
    const V = typeof vat === 'number' ? vat : 0;

    if (P <= 0) return null;

    const S = P - T - V;

    return {
      totalPrice: P,
      tariff: T,
      vat: V,
      shopFee: S,
    };
  }, [totalPrice, tariff, vat]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="total-price">Total Item Price (LKR)</Label>
          <Input
            id="total-price"
            type="number"
            placeholder="e.g., 15000"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tariff">Tariff Amount (LKR)</Label>
          <Input
            id="tariff"
            type="number"
            placeholder="e.g., 5000"
            value={tariff}
            onChange={(e) => setTariff(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="vat">VAT Amount (LKR)</Label>
          <Input
            id="vat"
            type="number"
            placeholder="e.g., 8250"
            value={vat}
            onChange={(e) => setVat(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      </div>
      <div>
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-semibold">Cost Breakdown</h3>
            {calculation ? (
              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-primary font-bold text-xl">
                  <span>Total Price:</span>
                  <span>{formatCurrency(calculation.totalPrice)}</span>
                </div>
                <hr />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">(-) Tariff:</span>
                  <span>{formatCurrency(calculation.tariff)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">(-) VAT:</span>
                  <span>{formatCurrency(calculation.vat)}</span>
                </div>
                <hr />
                 <div className={cn("flex justify-between items-center font-bold text-lg", calculation.shopFee < 0 && "text-destructive")}>
                  <span>Shop Fee / Base Price:</span>
                  <span>{formatCurrency(calculation.shopFee)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>Enter the total price and tax amounts to see the breakdown.</p>
              </div>
            )}
             <Alert className="text-xs">
              <Info className="h-4 w-4" />
              <AlertDescription>
                This calculator determines the remaining amount (Shop Fee) after subtracting the specified Tariff and VAT from the total price.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
