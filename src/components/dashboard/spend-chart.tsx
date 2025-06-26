'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useAppContext } from '@/contexts/app-context';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

export function SpendChart() {
  const { transactions } = useAppContext();

  const chartData = useMemo(() => {
    const endDate = new Date();
    const startDate = subDays(endDate, 29);
    const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

    const dailyExpenses = transactions
      .filter((t) => t.type === 'expense' && new Date(t.date) >= startDate)
      .reduce((acc, t) => {
        const day = format(new Date(t.date), 'yyyy-MM-dd');
        if (!acc[day]) {
          acc[day] = 0;
        }
        acc[day] += t.amount;
        return acc;
      }, {} as Record<string, number>);

    return dateInterval.map((day) => {
      const formattedDate = format(day, 'yyyy-MM-dd');
      return {
        date: format(day, 'MMM d'),
        total: dailyExpenses[formattedDate] || 0,
      };
    });
  }, [transactions]);
  
  const chartConfig = {
    total: {
      label: 'Spent',
      color: 'hsl(var(--chart-1))',
    },
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trend</CardTitle>
        <CardDescription>Your spending over the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ChartContainer config={chartConfig}>
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{
                left: 12,
                right: 12,
              }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} indicator="dot" />} />
              <Area
                dataKey="total"
                type="natural"
                fill="var(--color-total)"
                fillOpacity={0.4}
                stroke="var(--color-total)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
}
