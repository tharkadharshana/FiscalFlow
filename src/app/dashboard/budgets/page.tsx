
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
import { useAppContext } from '@/contexts/app-context';
import { PlusCircle, DraftingCompass, Sparkles } from 'lucide-react';
import { MonthlyBudgets } from '@/components/dashboard/monthly-budgets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePlanDialog } from '@/components/dashboard/create-plan-dialog';
import type { FinancialPlan } from '@/types';
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

export default function BudgetsPage() {
  const { financialPlans, deleteFinancialPlan, isPremium, budgets } = useAppContext();
  const [isCreateBudgetsDialogOpen, setIsCreateBudgetsDialogOpen] = useState(false);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [planToEdit, setPlanToEdit] = useState<FinancialPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<FinancialPlan | null>(null);

  const handleEditPlan = (plan: FinancialPlan) => {
    setPlanToEdit(plan);
    setIsCreatePlanDialogOpen(true);
  };
  
  const handleDeletePlan = (plan: FinancialPlan) => {
    setPlanToDelete(plan);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (planToDelete) {
      await deleteFinancialPlan(planToDelete.id);
      setIsDeleteDialogOpen(false);
      setPlanToDelete(null);
    }
  };

  const handlePlanDialogClose = (open: boolean) => {
    if (!open) {
      setPlanToEdit(null);
    }
    setIsCreatePlanDialogOpen(open);
  }

  const canAddBudget = isPremium || budgets.length < 5;

  const AddBudgetButton = (
     <Button onClick={() => setIsCreateBudgetsDialogOpen(true)} disabled={!canAddBudget}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Budget
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
                    <TabsTrigger value="plans" disabled={!isPremium}>
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
                    <MonthlyBudgets />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plans">
                {isPremium ? (
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                          <div>
                              <CardTitle>Financial Plans</CardTitle>
                              <CardDescription>
                                  Plan for trips, savings goals, and large purchases with AI assistance.
                              </CardDescription>
                          </div>
                          <Button onClick={() => setIsCreatePlanDialogOpen(true)}>
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create Plan
                          </Button>
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
                ) : (
                   <UpgradeCard 
                        title="Plan for Your Future with AI"
                        description="Create detailed, AI-assisted financial plans for your biggest goals with FiscalFlow Premium."
                        icon={DraftingCompass}
                    />
                )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Dialogs */}
      {isPremium && <CreateMonthlyBudgetsDialog open={isCreateBudgetsDialogOpen} onOpenChange={setIsCreateBudgetsDialogOpen} />}
      {isPremium && <CreatePlanDialog open={isCreatePlanDialogOpen} onOpenChange={handlePlanDialogClose} planToEdit={planToEdit} />}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your financial plan for "{planToDelete?.title}".
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
