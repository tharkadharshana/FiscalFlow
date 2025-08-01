

'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useAppContext } from '@/contexts/app-context';
import { format, parseISO, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Calendar as CalendarIconLucide } from 'lucide-react';

export default function CalendarPage() {
  const { transactions, categories, formatCurrency, isPremium } = useAppContext();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const transactionsByDay = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      const day = format(parseISO(transaction.date), 'yyyy-MM-dd');
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);
  }, [transactions]);

  const daysWithTransactions = useMemo(() => {
    return Object.keys(transactionsByDay).map(dayStr => parseISO(dayStr + 'T00:00:00'));
  }, [transactionsByDay]);

  const selectedDayTransactions = useMemo(() => {
    if (!selectedDate) return [];
    const dayKey = format(selectedDate, 'yyyy-MM-dd');
    return transactionsByDay[dayKey] || [];
  }, [selectedDate, transactionsByDay]);

  const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
    const Icon = categories[transaction.category] || categories['Food'];
    return (
      <div className="flex items-center gap-4 py-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={cn(
            'font-bold',
            transaction.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
          )}>
            <Icon className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 grid gap-1 overflow-hidden">
          <p className="font-medium truncate">{transaction.source}</p>
          <Badge variant="outline" className="w-fit">{transaction.category}</Badge>
        </div>
        <div className={cn(
          'font-bold text-right',
          transaction.type === 'income' ? 'text-green-600' : 'text-slate-800'
        )}>
          {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
        </div>
      </div>
    );
  };
  

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Calendar View" />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 p-4 md:p-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-2 md:p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="p-0 [&_td]:w-full"
              modifiers={{ hasTransaction: daysWithTransactions }}
              modifiersClassNames={{ hasTransaction: 'has-transaction' }}
              components={{
                DayContent: ({ date }) => {
                  const dayKey = format(date, 'yyyy-MM-dd');
                  const dailyTransactions = transactionsByDay[dayKey];
                  const dailyTotal = dailyTransactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div className="flex flex-col items-start justify-between p-1 w-full h-16">
                      <div className="font-medium">{format(date, 'd')}</div>
                      {dailyTotal > 0 && (
                        <div className="text-xs text-destructive truncate w-full self-end text-right">-{formatCurrency(dailyTotal, {
                            notation: 'compact',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                        })}</div>
                      )}
                    </div>
                  );
                }
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </CardTitle>
            <CardDescription>
              {selectedDayTransactions.length} transaction(s) on this day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-22rem)] pr-4">
              {selectedDayTransactions.length > 0 ? (
                <div className="divide-y">
                  {selectedDayTransactions.map(t => <TransactionItem key={t.id} transaction={t} />)}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-16">
                  <p>No transactions for this day.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
