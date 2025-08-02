

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info, Car, HandCoins, Building, Banknote, Shield } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';

type FuelType = 'petrol' | 'hybrid' | 'electric';

export function VehicleImportCalculator() {
  const { formatCurrency, taxRules } = useAppContext();

  const [cifValue, setCifValue] = useState<number | string>('');
  const [fuelType, setFuelType] = useState<FuelType>('petrol');
  const [engineCC, setEngineCC] = useState<number | string>('');
  const [exciseDutyOverride, setExciseDutyOverride] = useState<number | string>('');

  const calculationResults = useMemo(() => {
    if (!taxRules) return null;

    const cif = typeof cifValue === 'number' ? cifValue : 0;
    if (cif <= 0) return null;

    const { vehicleImport, palRate, vatRate } = taxRules;

    const cid = cif * vehicleImport.cidRate;
    const pal = cif * palRate;

    const cc = typeof engineCC === 'number' ? engineCC : 0;
    const exciseDuty = typeof exciseDutyOverride === 'number' && exciseDutyOverride > 0
      ? exciseDutyOverride
      : cc * 1000; // Simplified default calculation

    const { threshold, rate } = vehicleImport.luxuryTax[fuelType];
    const luxuryAmount = cif > threshold ? (cif - threshold) * rate : 0;

    const vatBase = cif + cid + pal + exciseDuty + luxuryAmount;
    const vat = vatBase * vatRate;

    const totalTax = cid + pal + exciseDuty + luxuryAmount + vat;
    const totalLandedCost = cif + totalTax;

    return { cif, cid, pal, exciseDuty, luxuryAmount, vat, totalTax, totalLandedCost };
  }, [cifValue, fuelType, engineCC, exciseDutyOverride, taxRules]);

  if (!taxRules) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <TooltipProvider>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="cif">CIF Value (in LKR)</Label>
                <Input id="cif" type="number" placeholder="e.g., 5500000" value={cifValue} onChange={(e) => setCifValue(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="engine-cc">Engine Capacity (CC)</Label>
                <Input id="engine-cc" type="number" placeholder="e.g., 1500" value={engineCC} onChange={(e) => setEngineCC(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="fuel-type">Fuel Type</Label>
                <Select value={fuelType} onValueChange={(v) => setFuelType(v as FuelType)}>
                  <SelectTrigger id="fuel-type"><SelectValue placeholder="Select fuel type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol / Diesel</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="electric">Electric / e-SMART</SelectItem>
                  </SelectContent>
                </Select>
            </div>
             <div className="space-y-2">
                <Label htmlFor="excise-override">Excise Duty Override (Optional)</Label>
                <Input id="excise-override" type="number" placeholder="Enter specific excise duty" value={exciseDutyOverride} onChange={(e) => setExciseDutyOverride(e.target.value === '' ? '' : Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">If empty, a simplified value based on Engine CC will be used.</p>
            </div>
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
              {calculationResults ? (
                <div className="space-y-3 font-mono">
                  <div className="flex justify-between items-center text-primary font-bold text-xl border-b pb-2">
                    <span className="flex items-center gap-2"><Car className="h-5 w-5"/>Total Landed Cost:</span>
                    <span>{formatCurrency(calculationResults.totalLandedCost)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4"/>CIF Value:</span>
                    <span>{formatCurrency(calculationResults.cif)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4"/>Customs Duty (CID):</span>
                    <span>{formatCurrency(calculationResults.cid)}</span>
                  </div>
                   <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><HandCoins className="h-4 w-4"/>Port & Airport Levy (PAL):</span>
                    <span>{formatCurrency(calculationResults.pal)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4"/>Excise Duty:</span>
                    <span>{formatCurrency(calculationResults.exciseDuty)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4"/>Luxury Tax:</span>
                    <span>{formatCurrency(calculationResults.luxuryAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2"><Banknote className="h-4 w-4"/>Value Added Tax (VAT):</span>
                    <span>{formatCurrency(calculationResults.vat)}</span>
                  </div>
                  <hr/>
                   <div className="flex justify-between items-center font-bold text-base">
                    <span>Total Taxes:</span>
                    <span>{formatCurrency(calculationResults.totalTax)}</span>
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
    </TooltipProvider>
  );
}
