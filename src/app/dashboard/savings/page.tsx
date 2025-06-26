
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
import { PlusCircle, PiggyBank } from 'lucide-react';
import type { SavingsGoal } from '@/types';
import { SavingsGoalCard } from '@/components/dashboard/savings-goal-card';
import { AddSavingsGoalDialog } from '@/components/dashboard/add-savings-goal-dialog';
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

export default function SavingsPage() {
  const { savingsGoals, deleteSavingsGoal, isPremium } = useAppContext();
  const [isAddGoalDialogOpen, setIsAddGoalDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [goalToEdit, setGoalToEdit] = useState<SavingsGoal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<SavingsGoal | null>(null);

  const handleEditGoal = (goal: SavingsGoal) => {
    setGoalToEdit(goal);
    setIsAddGoalDialogOpen(true);
  };
  
  const handleDeleteGoal = (goal: SavingsGoal) => {
    setGoalToDelete(goal);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (goalToDelete) {
      await deleteSavingsGoal(goalToDelete.id);
      setIsDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleGoalDialogClose = (open: boolean) => {
    if (!open) {
      setGoalToEdit(null);
    }
    setIsAddGoalDialogOpen(open);
  }

  if (!isPremium) {
    return (
        <div className="flex flex-1 flex-col">
            <Header title="Savings Goals" />
            <main className="flex-1 p-4 md:p-6">
                <UpgradeCard 
                    title="Gamify Your Savings"
                    description="Create goals, earn badges, and automatically save your spare change with our Round-up feature. Premium only."
                    icon={PiggyBank}
                />
            </main>
        </div>
    )
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Savings Goals" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Your Savings Goals</CardTitle>
                        <CardDescription>
                            Track your progress towards your financial goals with gamified rewards.
                        </CardDescription>
                    </div>
                    <Button onClick={() => { setGoalToEdit(null); setIsAddGoalDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Goal
                    </Button>
                </CardHeader>
                <CardContent>
                    {savingsGoals.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                            {savingsGoals.map((goal) => (
                                <SavingsGoalCard 
                                    key={goal.id} 
                                    goal={goal} 
                                    onEdit={() => handleEditGoal(goal)}
                                    onDelete={() => handleDeleteGoal(goal)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                            <PiggyBank className="h-12 w-12 mb-4" />
                            <p className="text-lg font-semibold">No savings goals created yet.</p>
                            <p>Click "New Goal" to start saving for something amazing.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
      </div>
      
      {/* Dialogs */}
      <AddSavingsGoalDialog open={isAddGoalDialogOpen} onOpenChange={handleGoalDialogClose} goalToEdit={goalToEdit} />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your savings goal for "{goalToDelete?.title}".
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
