
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/contexts/app-context';
import type { Budget, Transaction } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { List, ClipboardList } from 'lucide-react';


type BudgetDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
};

export function BudgetDetailsDialog({ open, onOpenChange, budget }: BudgetDetailsDialogProps) {
  const { categories, formatCurrency, transactions } = useAppContext();
  
  const budgetTransactions = useMemo(() => {
    if (!budget) return [];
    return transactions.filter(t => {
        const transactionMonth = t.date.slice(0, 7);
        return t.category === budget.category && transactionMonth === budget.month;
    })
  }, [budget, transactions]);
  
  if (!budget) return null;

  const spent = budget.currentSpend || 0;
  const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const remaining = budget.limit - spent;
  const Icon = categories[budget.category] || categories['Food'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-headline text-2xl">
            <Icon className="h-6 w-6 text-muted-foreground" />
            {budget.category} Details
          </DialogTitle>
          <DialogDescription>
            A closer look at your budget for {format(parseISO(`${budget.month}-01`), 'MMMM yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{formatCurrency(spent)}</span>
                <span className="text-muted-foreground">/ {formatCurrency(budget.limit)}</span>
            </div>
            <Progress value={progress} className={cn(progress > 90 && '[&>div]:bg-destructive')}/>
             <p className={`text-sm text-center ${remaining >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {remaining >= 0
                ? `${formatCurrency(remaining)} left to spend`
                : `${formatCurrency(Math.abs(remaining))} over budget`}
            </p>

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions"><List className="mr-2 h-4 w-4" />Transactions ({budgetTransactions.length})</TabsTrigger>
                <TabsTrigger value="planned"><ClipboardList className="mr-2 h-4 w-4" />Planned ({budget.items?.length || 0})</TabsTrigger>
              </TabsList>
              <TabsContent value="transactions" className="mt-4">
                <ScrollArea className="h-48 rounded-md border">
                    <div className="p-3">
                    {budgetTransactions.length > 0 ? (
                        <div className="space-y-3">
                        {budgetTransactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-medium">{tx.source}</p>
                                    <p className="text-xs text-muted-foreground">{format(parseISO(tx.date), 'MMM dd')}</p>
                                </div>
                                <span className={cn(tx.type === 'income' ? 'text-green-600' : 'text-slate-800','font-mono')}>{tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                           <p>No transactions recorded for this budget yet.</p>
                        </div>
                    )}
                    </div>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="planned" className="mt-4">
                 <ScrollArea className="h-48 rounded-md border p-3">
                    {budget.items && budget.items.length > 0 ? (
                        <div className="space-y-2">
                        {budget.items.map(item => (
                            <div key={item.id} className="flex justify-between items-center text-sm">
                                <span>{item.description}</span>
                                {item.predictedCost && (
                                    <Badge variant="outline">{formatCurrency(item.predictedCost)}</Badge>
                                )}
                            </div>
                        ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                           <p>No specific items were planned for this budget.</p>
                        </div>
                    )}
                </ScrollArea>
                {budget.userInput && (
                    <p className="text-xs text-muted-foreground italic pt-2">
                        <strong>Original input:</strong> "{budget.userInput}"
                    </p>
                )}
              </TabsContent>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
