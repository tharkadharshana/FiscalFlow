
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
  const { budgets, formatCurrency, transactionsForCurrentCycle } = useAppContext();

  const { chartData, chartConfig, totalAllocated, totalIncome } = useMemo(() => {
    const income = transactionsForCurrentCycle
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    
    if (income === 0) {
        return { chartData: [], chartConfig: {}, totalAllocated: 0, totalIncome: 0 };
    }

    const allocated = budgets.reduce((sum, b) => sum + b.limit, 0);
    const unallocated = income - allocated;

    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const data = budgets.map((budget, index) => {
        const color = colors[index % colors.length];
        return {
          name: budget.category,
          value: budget.limit,
          fill: color,
        };
      });

    if (unallocated > 0) {
        data.push({
            name: "Unallocated",
            value: unallocated,
            fill: "hsl(var(--muted))"
        })
    }
    
    const config: ChartConfig = data.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as ChartConfig);

    return { chartData: data, chartConfig: config, totalAllocated: allocated, totalIncome: income };
  }, [budgets, transactionsForCurrentCycle]);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="font-headline">Income Allocation</CardTitle>
        <CardDescription>How your monthly income is distributed.</CardDescription>
      </CardHeader>
      <CardContent>
        {totalIncome > 0 ? (
             <div className="flex flex-col items-center justify-center space-y-2">
                <p className="text-xs text-muted-foreground">Total Income This Cycle</p>
                <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart>
                        <ChartTooltip
                         cursor={false}
                         content={<ChartTooltipContent
                            formatter={(value) => `${formatCurrency(value as number)} (${((value as number / totalIncome) * 100).toFixed(0)}%)`}
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
                <p className="text-sm font-semibold">No income logged this cycle.</p>
                <p className="text-xs">Add an income transaction to get started.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
