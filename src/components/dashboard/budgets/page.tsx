
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
import { CreateTripPlanDialog } from '@/components/dashboard/create-trip-plan-dialog';
import type { TripPlan, Budget } from '@/types';
import { TripPlanCard } from '@/components/dashboard/trip-plan-card';
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
import { AllocationPieChart } from '@/components/dashboard/allocation-pie-chart';
import { TripReportDialog } from '@/components/dashboard/trip-report-dialog';

export default function BudgetsPage() {
  const { tripPlans, deleteTripPlan, restartTrip, isPremium, budgets, deleteBudget } = useAppContext();
  
  // Dialog states
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTripReportOpen, setIsTripReportOpen] = useState(false);
  
  // Data for dialogs
  const [planToEdit, setPlanToEdit] = useState<TripPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<TripPlan | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [tripForReport, setTripForReport] = useState<TripPlan | null>(null);


  const canAddBudget = isPremium || budgets.length < FREE_TIER_LIMITS.budgets;
  const canAddPlan = isPremium || (tripPlans && tripPlans.length < FREE_TIER_LIMITS.financialPlans);

  // Plan handlers
  const handleEditPlan = (plan: TripPlan) => {
    setPlanToEdit(plan);
    setIsCreatePlanDialogOpen(true);
  };
  
  const handleDeletePlan = (plan: TripPlan) => {
    setPlanToDelete(plan);
    setBudgetToDelete(null);
    setIsDeleteDialogOpen(true);
  };
  
  const handleRestartTrip = (planId: string) => {
    restartTrip(planId);
  }

  const handlePlanDialogClose = (open: boolean) => {
    if (!open) {
      setPlanToEdit(null);
    }
    setIsCreatePlanDialogOpen(open);
  }

  const handleViewTripReport = (trip: TripPlan) => {
    setTripForReport(trip);
    setIsTripReportOpen(true);
  };

  // Budget handlers
  const handleAddBudget = () => {
    setBudgetToEdit(null);
    setIsAddBudgetDialogOpen(true);
  }

  const handleEditBudget = (budget: Budget) => {
    setBudgetToEdit(budget);
    setIsAddBudgetDialogOpen(true);
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
      setIsAddBudgetDialogOpen(open);
  }

  const confirmDelete = async () => {
    if (planToDelete) {
      await deleteTripPlan(planToDelete.id);
    }
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setPlanToDelete(null);
    setBudgetToDelete(null);
  };

  const AddBudgetButton = (
     <Button onClick={handleAddBudget} disabled={!canAddBudget}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Budget
      </Button>
  );

  const CreatePlanButton = (
     <Button onClick={() => setIsCreatePlanDialogOpen(true)} disabled={!canAddPlan}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Trip Plan
      </Button>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Budgets & Trips" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="monthly">
            <div className='flex justify-between items-center mb-4'>
                <TabsList>
                    <TabsTrigger value="monthly">Monthly Budgets</TabsTrigger>
                    <TabsTrigger value="plans">
                      Trip Plans
                      {!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
                    </TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="monthly">
              <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
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
                  </div>
                  <div className="lg:col-span-1">
                      <AllocationPieChart />
                  </div>
              </div>
            </TabsContent>

            <TabsContent value="plans">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>Trip Plans</CardTitle>
                          <CardDescription>
                              Plan for trips and large purchases with AI assistance.
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
                      {tripPlans && tripPlans.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                              {tripPlans.map((plan) => (
                                  <TripPlanCard 
                                      key={plan.id} 
                                      trip={plan} 
                                      onEdit={() => handleEditPlan(plan)}
                                      onDelete={() => handleDeletePlan(plan)}
                                      onRestart={() => handleRestartTrip(plan.id)}
                                      onViewReport={() => handleViewTripReport(plan)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                              <DraftingCompass className="h-12 w-12 mb-4" />
                              <p className="text-lg font-semibold">No trip plans created yet.</p>
                              <p>Click "Create Trip Plan" to plan your next adventure with AI.</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
      
      {/* Dialogs */}
      <AddBudgetDialog 
        open={isAddBudgetDialogOpen} 
        onOpenChange={handleBudgetDialogClose} 
        budgetToEdit={budgetToEdit}
      />
      <CreateTripPlanDialog open={isCreatePlanDialogOpen} onOpenChange={handlePlanDialogClose} tripToEdit={planToEdit} />
      <BudgetDetailsDialog open={isBudgetDetailsOpen} onOpenChange={setIsBudgetDetailsOpen} budget={selectedBudget} />
      <TripReportDialog open={isTripReportOpen} onOpenChange={setIsTripReportOpen} trip={tripForReport} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your data for "{planToDelete?.title || budgetToDelete?.category}".
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
