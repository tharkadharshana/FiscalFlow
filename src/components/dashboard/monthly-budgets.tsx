
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Budget } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UpgradeCard } from '../ui/upgrade-card';
import { cn } from '@/lib/utils';

type MonthlyBudgetsProps = {
    onEditBudget: (budget: Budget) => void;
    onDeleteBudget: (budget: Budget) => void;
    onShowDetails: (budget: Budget) => void;
}

export function MonthlyBudgets({ onEditBudget, onDeleteBudget, onShowDetails }: MonthlyBudgetsProps) {
  const { budgets, categories, formatCurrency, isPremium } = useAppContext();
  
  const canAddMoreBudgets = isPremium || budgets.length < FREE_TIER_LIMITS.budgets;

  const BudgetCard = ({ budget }: { budget: Budget }) => {
    const spent = budget.currentSpend || 0;
    const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    const remaining = budget.limit - spent;
    const Icon = categories[budget.category] || categories['Food'];

    return (
      <Card className="flex flex-col cursor-pointer hover:border-primary/50 transition-colors" onClick={() => onShowDetails(budget)}>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className='flex items-center gap-4'>
            <Icon className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-xl">{budget.category}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditBudget(budget); }}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeleteBudget(budget); }} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{formatCurrency(spent)}</span>
            <span className="text-muted-foreground">/ {formatCurrency(budget.limit)}</span>
          </div>
          <Progress value={progress} className={cn(progress > 90 && '[&>div]:bg-destructive')} />
        </CardContent>
        <CardFooter>
          <p className={`text-sm ${remaining >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
            {remaining >= 0
              ? `${formatCurrency(remaining)} left to spend`
              : `${formatCurrency(Math.abs(remaining))} over budget`}
          </p>
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      {budgets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
          {!canAddMoreBudgets && (
            <UpgradeCard 
                title="Create More Budgets"
                description={`Free users can create up to ${FREE_TIER_LIMITS.budgets} budgets. Upgrade for unlimited.`}
            />
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-semibold">No budgets created for this month.</p>
          <p>Click "Add Budget" to get started.</p>
        </div>
      )}
    </>
  );
}
