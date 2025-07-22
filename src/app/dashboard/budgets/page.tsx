
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
import { TripReportDialog } from '@/components/dashboard/trip-report-dialog';

export default function BudgetsPage() {
  const { tripPlans, deleteTripPlan, isPremium, budgets, deleteBudget, userProfile } = useAppContext();
  
  // Dialog states
  const [isAddBudgetDialogOpen, setIsAddBudgetDialogOpen] = useState(false);
  const [isCreateTripDialogOpen, setIsCreateTripDialogOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  
  // Data for dialogs
  const [tripToEdit, setTripToEdit] = useState<TripPlan | null>(null);
  const [tripToDelete, setTripToDelete] = useState<TripPlan | null>(null);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [reportTrip, setReportTrip] = useState<TripPlan | null>(null);


  const canAddBudget = isPremium || budgets.length < FREE_TIER_LIMITS.budgets;
  const canAddTrip = isPremium || tripPlans.length < FREE_TIER_LIMITS.financialPlans;

  // Trip handlers
  const handleEditTrip = (trip: TripPlan) => {
    setTripToEdit(trip);
    setIsCreateTripDialogOpen(true);
  };
  
  const handleDeleteTrip = (trip: TripPlan) => {
    setTripToDelete(trip);
    setBudgetToDelete(null);
    setIsDeleteDialogOpen(true);
  };

  const handleTripDialogClose = (open: boolean) => {
    if (!open) {
      setTripToEdit(null);
    }
    setIsCreateTripDialogOpen(open);
  }

  const handleViewReport = (trip: TripPlan) => {
    setReportTrip(trip);
    setIsReportDialogOpen(true);
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
    setTripToDelete(null);
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
    if (tripToDelete) {
      await deleteTripPlan(tripToDelete.id);
    }
    if (budgetToDelete) {
      await deleteBudget(budgetToDelete.id);
    }
    setIsDeleteDialogOpen(false);
    setTripToDelete(null);
    setBudgetToDelete(null);
  };

  const AddBudgetButton = (
     <Button onClick={handleAddBudget} disabled={!canAddBudget}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Budget
      </Button>
  );

  const CreateTripButton = (
     <Button onClick={() => setIsCreateTripDialogOpen(true)} disabled={!canAddTrip || !!userProfile?.activeTripId}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Create Trip
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
                    <TabsTrigger value="trips">
                      Trip Planner
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

            <TabsContent value="trips">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                          <CardTitle>Trip Planner</CardTitle>
                          <CardDescription>
                              Plan for vacations and other events with dedicated budgets and tracking.
                          </CardDescription>
                      </div>
                      <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>{CreateTripButton}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                                {!!userProfile?.activeTripId ? 'You can only have one active trip at a time.' : 
                                !canAddTrip ? 'Upgrade to Premium for unlimited trips.' : <p>Create a new trip plan</p>}
                            </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                  </CardHeader>
                  <CardContent>
                      {tripPlans.length > 0 ? (
                          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                              {tripPlans.map((trip) => (
                                  <TripPlanCard 
                                      key={trip.id} 
                                      trip={trip} 
                                      onEdit={() => handleEditTrip(trip)}
                                      onDelete={() => handleDeleteTrip(trip)}
                                      onViewReport={() => handleViewReport(trip)}
                                  />
                              ))}
                          </div>
                      ) : (
                          <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                              <DraftingCompass className="h-12 w-12 mb-4" />
                              <p className="text-lg font-semibold">No trip plans created yet.</p>
                              <p>Click "Create Trip" to plan your next adventure with AI.</p>
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
      <CreateTripPlanDialog open={isCreateTripDialogOpen} onOpenChange={handleTripDialogClose} tripToEdit={tripToEdit} />
      <BudgetDetailsDialog open={isBudgetDetailsOpen} onOpenChange={setIsBudgetDetailsOpen} budget={selectedBudget} />
      <TripReportDialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen} trip={reportTrip} />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your plan for "{tripToDelete?.title || budgetToDelete?.category}".
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

