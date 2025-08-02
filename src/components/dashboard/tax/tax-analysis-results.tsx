
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useAppContext } from '@/contexts/app-context';
import type { AnalyzeTaxesOutput } from '@/types/schemas';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Pie, PieChart, Cell } from 'recharts';

type TaxAnalysisResultsProps = {
  report: AnalyzeTaxesOutput;
};

export function TaxAnalysisResults({ report }: TaxAnalysisResultsProps) {
  const { formatCurrency } = useAppContext();

  const { chartData, chartConfig, totals } = useMemo(() => {
    let totalShopFee = 0;
    let totalVat = 0;
    let totalOtherTax = 0;

    report.analyzedTransactions.forEach(tx => {
      if (tx.items && tx.items.length > 0 && tx.items[0].taxDetails) {
        const details = tx.items[0].taxDetails;
        totalShopFee += details.shopFee;
        totalVat += details.vat;
        totalOtherTax += details.tariff + details.excise + details.other;
      }
    });
    
    const data = [
      { name: 'Net Cost', value: totalShopFee, fill: 'hsl(var(--chart-1))' },
      { name: 'VAT', value: totalVat, fill: 'hsl(var(--chart-2))' },
      { name: 'Other Taxes', value: totalOtherTax, fill: 'hsl(var(--chart-3))' },
    ];

    const config: ChartConfig = data.reduce((acc, item) => {
        acc[item.name] = { label: item.name, color: item.fill };
        return acc;
    }, {} as ChartConfig);

    return { 
        chartData: data.filter(d => d.value > 0), 
        chartConfig: config,
        totals: { totalShopFee, totalVat, totalOtherTax }
    };

  }, [report]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Analysis Results</CardTitle>
        <CardDescription>
          Based on {report.analyzedTransactions.length} transactions, here is the estimated tax breakdown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center justify-center">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px] w-full"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent
                            formatter={(value) => formatCurrency(value as number)}
                            indicator='dot'
                            hideLabel
                            />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={60}
                            strokeWidth={2}
                        >
                            {chartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                            ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </div>
            <div className="space-y-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Net Cost (Shop Fee)</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.totalShopFee)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total VAT (18%)</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.totalVat)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Other Taxes</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-2xl font-bold">{formatCurrency(totals.totalOtherTax)}</p></CardContent>
                </Card>
            </div>
        </div>

        <div>
            <h4 className="text-lg font-semibold mb-2">Detailed Transactions</h4>
            <div className="max-h-96 overflow-y-auto rounded-md border">
                <Table>
                <TableHeader className="sticky top-0 bg-muted/95">
                    <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Total Price</TableHead>
                    <TableHead className="text-right">Shop Fee</TableHead>
                    <TableHead className="text-right">Total Tax</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {report.analyzedTransactions.length > 0 ? (
                    report.analyzedTransactions.map((tx) => {
                        const taxDetails = tx.items?.[0]?.taxDetails;
                        return (
                        <TableRow key={tx.id}>
                            <TableCell>{format(new Date(tx.date), "yyyy-MM-dd")}</TableCell>
                            <TableCell className="font-medium">{tx.source}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(taxDetails?.shopFee || 0)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCurrency(taxDetails?.totalTax || 0)}</TableCell>
                        </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No analyzed transactions found.</TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
