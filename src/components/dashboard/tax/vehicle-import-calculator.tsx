

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
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
      : cc * 1000;

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
          {/* ... input fields ... */}
        </div>
        <div>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Calculation Breakdown</h3>
              {calculationResults ? (
                <div className="space-y-3 font-mono">
                  {/* ... output fields ... */}
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
