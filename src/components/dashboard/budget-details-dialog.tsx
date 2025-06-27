
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
import type { Budget } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

type BudgetDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
};

export function BudgetDetailsDialog({ open, onOpenChange, budget }: BudgetDetailsDialogProps) {
  const { categories, formatCurrency } = useAppContext();
  
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
            A closer look at your budget for this month.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold">{formatCurrency(spent)}</span>
                <span className="text-muted-foreground">/ {formatCurrency(budget.limit)}</span>
            </div>
            <Progress value={progress} />
             <p className={`text-sm text-center ${remaining >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                {remaining >= 0
                ? `${formatCurrency(remaining)} left to spend`
                : `${formatCurrency(Math.abs(remaining))} over budget`}
            </p>

            <div className="space-y-3 pt-4">
                <h4 className="font-medium">Planned Items</h4>
                <ScrollArea className="h-40 rounded-md border p-3">
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
                    <p className="text-xs text-muted-foreground italic">
                        <strong>Original input:</strong> "{budget.userInput}"
                    </p>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
