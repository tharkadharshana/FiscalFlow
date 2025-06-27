
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
import { PlusCircle, DraftingCompass, Sparkles } from 'lucide-react';
import { MonthlyBudgets } from '@/components/dashboard/monthly-budgets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePlanDialog } from '@/components/dashboard/create-plan-dialog';
import type { FinancialPlan, Budget } from '@/types';
import { FinancialPlanCard } from '@/components/dashboard/financial-plan-card';
import { CreateMonthlyBudgetsDialog } from '@/components/dashboard/create-monthly-budgets-dialog';
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
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BudgetDetailsDialog } from '@/components/dashboard/budget-details-dialog';

export default function BudgetsPage() {
  const { financialPlans, deleteFinancialPlan, isPremium, budgets, deleteBudget } = useAppContext();
  
  // Dialog states
  const [isCreateBudgetsDialogOpen, setIsCreateBudgetsDialogOpen] = useState(false);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Data for dialogs
  const [planToEdit, setPlanToEdit] = useState<FinancialPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<FinancialPlan | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);


  const canAddBudget = isPremium || budgets.length < FREE_TIER_LIMITS.budgets;
  const canAddPlan = isPremium || financialPlans.length < FREE_TIER_LIMITS.financialPlans;

  // Plan handlers
  const handleEditPlan = (plan: FinancialPlan) => {
    setPlanToEdit(plan);
    setIsCreatePlanDialogOpen(true);
  };
  
  const handleDeletePlan = (plan: FinancialPlan) => {
    setPlanToDelete(plan);
    setBudgetToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handlePlanDialogClose = (open: boolean) => {
    if (!open) {
      setPlanToEdit(null);
    }
    setIsCreatePlanDialogOpen(open);
  }

  // Budget handlers
  const handleCreateBudget = () => {
    setBudgetToEdit(null);
    setIsCreateBudgetsDialogOpen(true);
  }

  const handleEditBudget = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsCreateBudgetsDialogOpen(true);
  }

  const handleDeleteBudget = (budget: Budget) => {
    setBudgetToDelete(budget);
    setPlanToDelete(null);
    setIsDeleteDialogOpen(true);
  }

  const handleShowBudgetDetails = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsBudgetDetailsOpen(true);
  }
  
  const handleBudgetDialogClose = (open: boolean) => {
      if (!open) {
          setBudgetToEdit(null);
      }
      setIsCreateBudgetsDialogOpen(open);
  }

  const confirmDelete = async () => {
    if (planToDelete) {
      await deleteFinancialPlan(planToDelete.id);
    }
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setPlanToDelete(null);
    setBudgetToDelete(null);
  };

  const AddBudgetButton = (
     <Button onClick={handleCreateBudget} disabled={!canAddBudget}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Budget
      </Button>
  );

  const CreatePlanButton = (
     <Button onClick={() => setIsCreatePlanDialogOpen(true)} disabled={!canAddPlan}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Plan
      </Button>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Budgets & Plans" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="monthly">
            <div className='flex justify-between items-center mb-4'>
                <TabsList>
                    <TabsTrigger value="monthly">Monthly Budgets</TabsTrigger>
                    <TabsTrigger value="plans">
                      Financial Plans
                      {!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="monthly">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Category Budgets</CardTitle>
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
            </TabsContent>

            <TabsContent value="plans">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>Financial Plans</CardTitle>
                          <CardDescription>
                              Plan for trips, savings goals, and large purchases with AI assistance.
                          </CardDescription>
                      </div>
                      {canAddPlan ? (
                        CreatePlanButton
                      ) : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>{CreatePlanButton}</TooltipTrigger>
                                <TooltipContent>
                                    <p>Upgrade to Premium for unlimited plans.</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                      )}
                  </CardHeader>
                  <CardContent>
                      {financialPlans.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                              {financialPlans.map((plan) => (
                                  <FinancialPlanCard 
                                      key={plan.id} 
                                      plan={plan} 
                                      onEdit={() => handleEditPlan(plan)}
                                      onDelete={() => handleDeletePlan(plan)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                              <DraftingCompass className="h-12 w-12 mb-4" />
                              <p className="text-lg font-semibold">No financial plans created yet.</p>
                              <p>Click "Create Plan" to plan your next big goal with AI.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Dialogs */}
      <CreateMonthlyBudgetsDialog open={isCreateBudgetsDialogOpen} onOpenChange={handleBudgetDialogClose} budgetToEdit={budgetToEdit} />
      <CreatePlanDialog open={isCreatePlanDialogOpen} onOpenChange={handlePlanDialogClose} planToEdit={planToEdit} />
      <BudgetDetailsDialog open={isBudgetDetailsOpen} onOpenChange={setIsBudgetDetailsOpen} budget={selectedBudget} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your financial plan for "{planToDelete?.title || budgetToDelete?.category}".
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
