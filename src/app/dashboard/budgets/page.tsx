
'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { PlusCircle, Sparkles } from 'lucide-react';
import { MonthlyBudgets } from '@/components/dashboard/monthly-budgets';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BudgetDetailsDialog } from '@/components/dashboard/budget-details-dialog';
import { AddBudgetDialog } from '@/components/dashboard/add-budget-dialog';
import type { Budget } from '@/types';
import { AllocationPieChart } from '@/components/dashboard/allocation-pie-chart';

export default function BudgetsPage() {
  const { isPremium, budgets, deleteBudget } = useAppContext();
  
  // Dialog states
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Data for dialogs
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);


  const canAddBudget = isPremium || budgets.length < FREE_TIER_LIMITS.budgets;

  // --- Explicit handlers for each action ---

  const handleAddNewBudget = () => {
    console.log('budgets/page.tsx: handleAddNewBudget triggered');
    setBudgetToEdit(null); // Ensure we're not in edit mode
    setIsAddBudgetDialogOpen(true);
    console.log('budgets/page.tsx: AddBudgetDialog should open for new budget');
  }

  const handleEditBudget = (budget: Budget) => {
    console.log('budgets/page.tsx: handleEditBudget triggered for budget:', budget.id);
    setBudgetToEdit(budget);
    setIsAddBudgetDialogOpen(true);
     console.log('budgets/page.tsx: AddBudgetDialog should open for editing budget:', budget.id);
  }

  const handleShowBudgetDetails = (budget: Budget) => {
    console.log('budgets/page.tsx: handleShowBudgetDetails triggered for budget:', budget.id);
    setSelectedBudget(budget);
    setIsBudgetDetailsOpen(true);
  }

  const handleDeleteBudget = (budget: Budget) => {
    console.log('budgets/page.tsx: handleDeleteBudget triggered for budget:', budget.id);
    // THIS IS THE KEY FIX: Ensure the edit dialog is closed and its state is cleared
    // before opening the delete confirmation dialog.
    setIsAddBudgetDialogOpen(false); 
    setBudgetToEdit(null);

    setBudgetToDelete(budget);
    setIsDeleteDialogOpen(true);
    console.log('budgets/page.tsx: Delete confirmation dialog should open for budget:', budget.id);
  }
  
  const handleBudgetDialogClose = (open: boolean) => {
    console.log('budgets/page.tsx: handleBudgetDialogClose called with open =', open);
    setIsAddBudgetDialogOpen(open);
    if (!open) {
      console.log('budgets/page.tsx: Dialog closing, clearing budgetToEdit state.');
      // Always clear the edit state when the dialog closes.
      setBudgetToEdit(null);
    }
  }

  const confirmDelete = async () => {
    console.log('budgets/page.tsx: confirmDelete triggered for budgetToDelete:', budgetToDelete?.id);
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    console.log('budgets/page.tsx: Closing delete dialog and clearing budgetToDelete.');
    setBudgetToDelete(null);
  };

  const AddBudgetButton = (
     <Button onClick={handleAddNewBudget} disabled={!canAddBudget}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Budget
      </Button>
  );


  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Budgets & Plans" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Monthly Budgets</CardTitle>
                      <CardDescription>
                        Set and track your monthly spending limits for each category.
                      </CardDescription>
                    </div>
                    {canAddBudget ? (
                      AddBudgetButton
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>{AddBudgetButton}</TooltipTrigger>
                          <TooltipContent>
                            <p>Upgrade to Premium for unlimited budgets.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </CardHeader>
                  <CardContent>
                      <MonthlyBudgets 
                        onEditBudget={handleEditBudget}
                        onDeleteBudget={handleDeleteBudget}
                        onShowDetails={handleShowBudgetDetails}
                      />
                  </CardContent>
                </Card>
              </div>
              <div className="lg:col-span-1">
                <AllocationPieChart />
              </div>
            </div>
        </main>
      </div>
      
      {/* Dialogs */}
      <AddBudgetDialog 
        open={isAddBudgetDialogOpen} 
        onOpenChange={handleBudgetDialogClose} 
        budgetToEdit={budgetToEdit}
      />
      <BudgetDetailsDialog open={isBudgetDetailsOpen} onOpenChange={setIsBudgetDetailsOpen} budget={selectedBudget} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your budget for "{budgetToDelete?.category}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
