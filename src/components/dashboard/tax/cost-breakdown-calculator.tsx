
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/app-context';
import { Info, HandCoins, Landmark, Building } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function CostBreakdownCalculator() {
  const { formatCurrency, taxRules } = useAppContext();
  const [totalPrice, setTotalPrice] = useState<number | string>('');

  const calculation = useMemo(() => {
    const P = typeof totalPrice === 'number' ? totalPrice : 0;
    if (P <= 0 || !taxRules) return null;

    // Use live tax rules from context
    const vatRate = taxRules.vatRate;
    const sslRate = taxRules.sslRate;

    // Reverse calculate to find base price
    // P = Base * (1 + vatRate) * (1 + sslRate)
    const basePrice = P / ((1 + vatRate) * (1 + sslRate));
    
    const vat = basePrice * vatRate;
    const ssl = (basePrice + vat) * sslRate; // SSL is often on the VAT-inclusive price
    const shopFee = basePrice; // The "shop fee" is the price before any taxes

    return {
      totalPrice: P,
      vat,
      ssl,
      shopFee,
    };
  }, [totalPrice, taxRules]);

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
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>How this works</AlertTitle>
            <AlertDescription>
                Enter the final price of a local item. The calculator will reverse-calculate the tax components based on the current system-wide tax rules. This is for items that do not have special tariffs or excise duties.
            </AlertDescription>
        </Alert>
      </div>
      <div>
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Cost Component Breakdown</h3>
            {calculation ? (
              <div className="space-y-4 font-mono">
                <div className="flex justify-between items-center text-primary font-bold text-lg border-b pb-2">
                  <span>Total Price:</span>
                  <span>{formatCurrency(calculation.totalPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><Landmark className="h-4 w-4"/>VAT ({taxRules.vatRate * 100}%):</span>
                  <span>{formatCurrency(calculation.vat)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-2"><HandCoins className="h-4 w-4"/>SSL ({taxRules.sslRate * 100}%):</span>
                  <span>{formatCurrency(calculation.ssl)}</span>
                </div>
                <hr/>
                <div className="flex justify-between items-center font-bold">
                  <span className="flex items-center gap-2"><Building className="h-4 w-4"/>Base Price (Shop Fee):</span>
                  <span>{formatCurrency(calculation.shopFee)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>Enter a total price to see the breakdown.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
