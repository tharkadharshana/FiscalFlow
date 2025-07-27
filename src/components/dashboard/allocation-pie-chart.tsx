
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
import { PieChart as PieChartIcon } from 'lucide-react';

export function AllocationPieChart() {
  const { budgets, formatCurrency } = useAppContext();

  const { chartData, chartConfig, totalAllocated } = useMemo(() => {
    if (budgets.length === 0) {
        return { chartData: [], chartConfig: {}, totalAllocated: 0 };
    }

    const total = budgets.reduce((sum, b) => sum + b.limit, 0);

    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const data = budgets.map((budget, index) => {
        const color = colors[index % colors.length];
        return {
          name: budget.category,
          value: budget.limit,
          fill: color,
        };
      });

    const config: ChartConfig = data.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as ChartConfig);

    return { chartData: data, chartConfig: config, totalAllocated: total };
  }, [budgets]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Budget Allocation</CardTitle>
        <CardDescription>How your monthly budget is distributed.</CardDescription>
      </CardHeader>
      <CardContent>
        {budgets.length > 0 ? (
             <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-xs text-muted-foreground">Total Budgeted</p>
                <p className="text-2xl font-bold">{formatCurrency(totalAllocated)}</p>
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                         cursor={false}
                         content={<ChartTooltipContent
                            formatter={(value) => formatCurrency(value as number)}
                            indicator='dot'
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
            </div>
        ) : (
            <div className="py-10 text-center text-muted-foreground flex flex-col items-center">
                <PieChartIcon className="h-10 w-10 mb-4" />
                <p className="text-sm font-semibold">No budgets created yet.</p>
                <p className="text-xs">Add a budget to see your allocation here.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
