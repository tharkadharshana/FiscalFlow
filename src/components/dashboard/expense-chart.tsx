'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { Pie, PieChart, Cell } from 'recharts';

export function ExpenseChart() {
  const { transactions } = useAppContext();

  const { chartData, chartConfig } = useMemo(() => {
    const expenseData = transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = { amount: 0, fill: '' };
        }
        acc[t.category].amount += t.amount;
        return acc;
      }, {} as Record<string, { amount: number; fill: string }>);

    const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

    const data = Object.entries(expenseData).map(([category, value], index) => {
        const color = colors[index % colors.length];
        return {
          name: category,
          value: value.amount,
          fill: color,
        };
      });

    const config: ChartConfig = data.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as ChartConfig);

    return { chartData: data, chartConfig: config };
  }, [transactions]);
  
  const totalExpenses = useMemo(
    () => chartData.reduce((acc, curr) => acc + curr.value, 0),
    [chartData]
  )

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="font-headline">Expense Distribution</CardTitle>
        <CardDescription>Showing expense breakdown by category for this month.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Total spent this month: ${totalExpenses.toFixed(2)}
        </div>
        <div className="leading-none text-muted-foreground">
          Categories contributing to expenses.
        </div>
      </CardFooter>
    </Card>
  );
}
