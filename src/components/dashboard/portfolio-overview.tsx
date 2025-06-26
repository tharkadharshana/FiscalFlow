
'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { Pie, PieChart, Cell } from 'recharts';
import { Briefcase } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

export function PortfolioOverview() {
  const { investments, formatCurrency } = useAppContext();

  const { chartData, chartConfig, totalValue } = useMemo(() => {
    const portfolioValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
    
    if (investments.length === 0) {
        return { chartData: [], chartConfig: {}, totalValue: 0 };
    }

    const dataByType = investments.reduce((acc, inv) => {
        if (!acc[inv.assetType]) {
            acc[inv.assetType] = 0;
        }
        acc[inv.assetType] += inv.quantity * inv.currentPrice;
        return acc;
    }, {} as Record<string, number>);


    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const data = Object.entries(dataByType).map(([type, value], index) => {
        const color = colors[index % colors.length];
        return {
          name: type,
          value: value,
          fill: color,
        };
      });

    const config: ChartConfig = data.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as ChartConfig);

    return { chartData: data, chartConfig: config, totalValue: portfolioValue };
  }, [investments]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Portfolio Overview</CardTitle>
        <CardDescription>A summary of your investment holdings.</CardDescription>
      </CardHeader>
      <CardContent>
        {investments.length > 0 ? (
             <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[200px]"
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
                        innerRadius={50}
                        strokeWidth={2}
                        >
                        {chartData.map((entry) => (
                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                        </Pie>
                    </PieChart>
                </ChartContainer>
                <Button asChild variant="outline" className="w-full mt-4">
                    <Link href="/dashboard/investments">View Full Portfolio</Link>
                </Button>
            </div>
        ) : (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                <Briefcase className="h-10 w-10 mb-4" />
                <p className="text-sm font-semibold">No investments tracked yet.</p>
                <p className="text-xs">Add your holdings to see an overview here.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
