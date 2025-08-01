
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { DollarSign, TrendingUp, TrendingDown, Scale } from 'lucide-react';

type ReportData = {
  totalIncome: number;
  totalExpenses: number;
};

export function ReportSummaryCards({ data }: { data: ReportData }) {
  const { formatCurrency } = useAppContext();
  const netFlow = data.totalIncome - data.totalExpenses;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalIncome)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(data.totalExpenses)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          <Scale className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', netFlow >= 0 ? 'text-green-600' : 'text-red-600')}>
            {formatCurrency(netFlow)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
