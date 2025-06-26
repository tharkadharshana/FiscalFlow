
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAppContext } from '@/contexts/app-context';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { AddBudgetDialog } from '@/components/dashboard/add-budget-dialog';
import type { Budget } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UpgradeCard } from '../ui/upgrade-card';

export function MonthlyBudgets() {
  const { budgets, categories, deleteBudget, formatCurrency, isPremium } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

  const handleEdit = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsDialogOpen(true);
  }

  const handleDelete = (budget: Budget) => {
    setBudgetToDelete(budget);
    setIsDeleteAlertOpen(true);
  }

  const confirmDelete = () => {
    if (budgetToDelete) {
      deleteBudget(budgetToDelete.id);
      setIsDeleteAlertOpen(false);
      setBudgetToDelete(null);
    }
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setBudgetToEdit(null);
    }
    setIsDialogOpen(open);
  }
  
  const canAddMoreBudgets = isPremium || budgets.length < 5;

  const BudgetCard = ({ budget }: { budget: Budget }) => {
    const spent = budget.currentSpend || 0;
    const progress = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
    const remaining = budget.limit - spent;
    const Icon = categories[budget.category] || categories['Food'];

    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className='flex items-center gap-4'>
            <Icon className="h-6 w-6 text-muted-foreground" />
            <CardTitle className="text-xl">{budget.category}</CardTitle>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(budget)}>
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(budget)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{formatCurrency(spent)}</span>
            <span className="text-muted-foreground">/ {formatCurrency(budget.limit)}</span>
          </div>
          <Progress value={progress} />
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
                title="Create Unlimited Budgets"
                description="Take full control of your finances by creating budgets for every category."
            />
          )}
        </div>
      ) : (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-semibold">No budgets created for this month.</p>
          <p>Click "Add Budget" to get started.</p>
        </div>
      )}
      
      <AddBudgetDialog open={isDialogOpen} onOpenChange={handleDialogClose} budgetToEdit={budgetToEdit}/>
      
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your budget for {'"'}
                {budgetToDelete?.category}{'"'}.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
