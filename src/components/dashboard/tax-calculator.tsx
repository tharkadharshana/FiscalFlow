
'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export function TaxCalculator() {
  const [cifValue, setCifValue] = useState<number | string>('');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [engineCC, setEngineCC] = useState<number | string>('');

  const formatCurrency = (amount: number, currency = 'LKR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculationResults = useMemo(() => {
    const cif = typeof cifValue === 'number' ? cifValue : 0;
    if (cif <= 0) return null;

    // Tax rates from your prompt
    const cidRate = 0.30; // 20% + 50% surcharge
    const palRate = 0.10;

    // Luxury tax thresholds and rates
    const luxuryTaxConfig = {
      petrol: { threshold: 5000000, rate: 1.00 },
      diesel: { threshold: 5000000, rate: 1.20 },
      hybrid: { threshold: 5500000, rate: 0.80 }, // simplified average
      electric: { threshold: 6000000, rate: 0.60 },
    };

    const vatRate = 0.18;

    // Calculations
    const cid = cif * cidRate;
    const pal = cif * palRate;

    // Simplified excise duty based on engine size - placeholder logic
    const cc = typeof engineCC === 'number' ? engineCC : 0;
    const exciseDuty = cc * 1000; // Example: 1000 LKR per CC

    const { threshold, rate } = luxuryTaxConfig[fuelType];
    const luxuryAmount = cif > threshold ? (cif - threshold) * rate : 0;
    
    const vatBase = cif + cid + pal + exciseDuty + luxuryAmount;
    const vat = vatBase * vatRate;

    const totalTax = cid + pal + exciseDuty + luxuryAmount + vat;
    const totalLandedCost = cif + totalTax;

    return {
      cif,
      cid,
      pal,
      exciseDuty,
      luxuryAmount,
      vat,
      totalTax,
      totalLandedCost,
    };
  }, [cifValue, fuelType, engineCC]);

  return (
    <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="cif">CIF Value (in LKR)</Label>
                <Input
                    id="cif"
                    type="number"
                    placeholder="e.g., 5500000"
                    value={cifValue}
                    onChange={(e) => setCifValue(Number(e.target.value))}
                />
            </div>
             <div className="space-y-2">
                <Label htmlFor="engine-cc">Engine Capacity (CC)</Label>
                <Input
                    id="engine-cc"
                    type="number"
                    placeholder="e.g., 1500"
                    value={engineCC}
                    onChange={(e) => setEngineCC(Number(e.target.value))}
                />
                 <p className="text-xs text-muted-foreground">Used for simplified Excise Duty calculation.</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                  <SelectTrigger id="fuel-type">
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol / Diesel</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="electric">Electric / e-SMART</SelectItem>
                  </SelectContent>
                </Select>
            </div>
        </div>
        <div>
            <Card>
                <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
                    {calculationResults ? (
                        <div className="space-y-3 font-mono">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">CIF Value:</span>
                                <span>{formatCurrency(calculationResults.cif)}</span>
                            </div>
                            <hr/>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Customs Import Duty (CID):</span>
                                <span>{formatCurrency(calculationResults.cid)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Port & Airport Levy (PAL):</span>
                                <span>{formatCurrency(calculationResults.pal)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Excise Duty (Est.):</span>
                                <span>{formatCurrency(calculationResults.exciseDuty)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Luxury Tax:</span>
                                <span>{formatCurrency(calculationResults.luxuryAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Value Added Tax (VAT):</span>
                                <span>{formatCurrency(calculationResults.vat)}</span>
                            </div>
                            <hr/>
                            <div className="flex justify-between items-center font-bold text-base">
                                <span>Total Import Taxes:</span>
                                <span>{formatCurrency(calculationResults.totalTax)}</span>
                            </div>
                             <div className="flex justify-between items-center font-bold text-xl text-primary mt-4 pt-4 border-t">
                                <span>Total Landed Cost:</span>
                                <span>{formatCurrency(calculationResults.totalLandedCost)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            <p>Enter a CIF value to start the calculation.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
