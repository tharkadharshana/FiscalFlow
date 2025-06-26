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
import { PlusCircle, DraftingCompass } from 'lucide-react';
import { MonthlyBudgets } from '@/components/dashboard/monthly-budgets';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePlanDialog } from '@/components/dashboard/create-plan-dialog';
import type { FinancialPlan } from '@/types';
import { FinancialPlanCard } from '@/components/dashboard/financial-plan-card';
import { CreateMonthlyBudgetsDialog } from '@/components/dashboard/create-monthly-budgets-dialog';

export default function BudgetsPage() {
  const { financialPlans } = useAppContext();
  const [isCreateBudgetsDialogOpen, setIsCreateBudgetsDialogOpen] = useState(false);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  
  const [planToEdit, setPlanToEdit] = useState<FinancialPlan | null>(null);

  const handleEditPlan = (plan: FinancialPlan) => {
    setPlanToEdit(plan);
    setIsCreatePlanDialogOpen(true);
  };
  
  const handleDeletePlan = (planId: string) => {
    // Placeholder for delete confirmation dialog
    console.log("Deleting plan", planId);
  };

  const handlePlanDialogClose = (open: boolean) => {
    if (!open) {
      setPlanToEdit(null);
    }
    setIsCreatePlanDialogOpen(open);
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Budgets & Plans" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="monthly">
            <div className='flex justify-between items-center mb-4'>
                <TabsList>
                    <TabsTrigger value="monthly">Monthly Budgets</TabsTrigger>
                    <TabsTrigger value="plans">Financial Plans</TabsTrigger>
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
                  <Button onClick={() => setIsCreateBudgetsDialogOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Budget
                  </Button>
                </CardHeader>
                <CardContent>
                    <MonthlyBudgets />
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
                                        onDelete={() => handleDeletePlan(plan.id)}
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
      <CreateMonthlyBudgetsDialog open={isCreateBudgetsDialogOpen} onOpenChange={setIsCreateBudgetsDialogOpen} />
      <CreatePlanDialog open={isCreatePlanDialogOpen} onOpenChange={handlePlanDialogClose} planToEdit={planToEdit} />
    </>
  );
}
