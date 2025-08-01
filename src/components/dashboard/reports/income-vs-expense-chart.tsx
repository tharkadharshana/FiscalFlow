
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAppContext } from '@/contexts/app-context';

type ChartData = {
  transactions: any[];
  totalIncome: number;
  totalExpenses: number;
};

type Props = {
  data: ChartData;
};

export function IncomeVsExpenseChart({ data }: Props) {
  const { formatCurrency } = useAppContext();
  const chartData = [
    { name: 'Income', total: data.totalIncome, fill: 'var(--color-income)' },
    { name: 'Expenses', total: data.totalExpenses, fill: 'var(--color-expenses)' },
  ];

  const chartConfig = {
    total: { label: 'Total', color: 'hsl(var(--chart-1))' },
    income: { label: 'Income', color: 'hsl(var(--chart-2))' },
    expenses: { label: 'Expenses', color: 'hsl(var(--chart-1))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs. Expense</CardTitle>
        <CardDescription>A comparison of your total income and expenses for the selected period.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[200px]">
          <BarChart data={chartData} layout="vertical" accessibilityLayer>
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              className="fill-muted-foreground"
            />
            <XAxis type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} indicator="dot" />} />
            <Bar dataKey="total" radius={5} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

