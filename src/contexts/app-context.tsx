
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { categories as categoryIcons, defaultExpenseCategories, defaultIncomeCategories } from '@/data/mock-data';
import type { Transaction, Budget, UserProfile, FinancialPlan, RecurringTransaction, SavingsGoal, Badge } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
  Timestamp,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  runTransaction,
  arrayUnion,
  arrayRemove,
  where,
  getDocs,
  writeBatch,
} from 'firebase/firestore';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'icon'>) => void;
  updateTransaction: (transactionId: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (transactionId: string) => Promise<void>;
  logout: () => Promise<void>;
  categories: Record<string, React.ComponentType<{ className?: string }>>;
  expenseCategories: string[];
  incomeCategories: string[];
  allCategories: string[];
  addCustomCategory: (category: string) => Promise<void>;
  deleteCustomCategory: (category: string) => Promise<void>;
  budgets: Budget[];
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'userId' | 'month' | 'currentSpend'>) => Promise<void>;
  updateBudget: (budgetId: string, data: Partial<Omit<Budget, 'id'>>) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  financialPlans: FinancialPlan[];
  addFinancialPlan: (plan: Omit<FinancialPlan, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateFinancialPlan: (planId: string, data: Partial<Omit<FinancialPlan, 'id'>>) => Promise<void>;
  deleteFinancialPlan: (planId: string) => Promise<void>;
  updateUserPreferences: (data: Partial<UserProfile>) => Promise<void>;
  recurringTransactions: RecurringTransaction[];
  addRecurringTransaction: (transaction: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateRecurringTransaction: (transactionId: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => Promise<void>;
  deleteRecurringTransaction: (transactionId: string) => Promise<void>;
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'currentAmount' | 'badges'>) => Promise<void>;
  updateSavingsGoal: (goalId: string, data: Partial<Omit<SavingsGoal, 'id'>>) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [financialPlans, setFinancialPlans] = useState<FinancialPlan[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (!user) {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Effect to toggle dark mode
  useEffect(() => {
    if (typeof window !== 'undefined' && userProfile) {
      if (userProfile.darkModeBanner) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProfile]);

  const customCategories = useMemo(() => userProfile?.customCategories || [], [userProfile]);

  const expenseCategories = useMemo(() => [...defaultExpenseCategories, ...customCategories].sort(), [customCategories]);
  const incomeCategories = useMemo(() => [...defaultIncomeCategories, ...customCategories].sort(), [customCategories]);
  const allCategories = useMemo(() => [...new Set([...expenseCategories, ...incomeCategories])].sort(), [expenseCategories, incomeCategories]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserProfile({ uid: doc.id, ...doc.data() } as UserProfile);
        }
        setLoading(false);
      });

      const qTransactions = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
      const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
        const userTransactions: Transaction[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate().toISOString(),
            icon: categoryIcons[doc.data().category] || categoryIcons['Food'],
        } as Transaction));
        setTransactions(userTransactions);
      });

      const currentMonth = new Date().toISOString().slice(0, 7);
      const qBudgets = query(collection(db, 'users', user.uid, 'budgets'), where('month', '==', currentMonth));
      const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
        const userBudgets: Budget[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as Budget));
        setBudgets(userBudgets);
      });
      
      const qPlans = query(collection(db, 'users', user.uid, 'financialPlans'), orderBy('createdAt', 'desc'));
      const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
        const userPlans: FinancialPlan[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as FinancialPlan));
        setFinancialPlans(userPlans);
      });

      const qRecurring = query(collection(db, 'users', user.uid, 'recurringTransactions'), orderBy('createdAt', 'desc'));
      const unsubscribeRecurring = onSnapshot(qRecurring, (snapshot) => {
        const userRecurring: RecurringTransaction[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), startDate: (doc.data().startDate as Timestamp).toDate().toISOString(),
            lastGeneratedDate: doc.data().lastGeneratedDate?.toDate().toISOString(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as RecurringTransaction));
        setRecurringTransactions(userRecurring);
      });

      const qGoals = query(collection(db, 'users', user.uid, 'savingsGoals'), orderBy('createdAt', 'desc'));
      const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
        const userGoals: SavingsGoal[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), deadline: doc.data().deadline,
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as SavingsGoal));
        setSavingsGoals(userGoals);
      });


      return () => {
        unsubscribeProfile();
        unsubscribeTransactions();
        unsubscribeBudgets();
        unsubscribePlans();
        unsubscribeRecurring();
        unsubscribeGoals();
      };
    } else {
      setUserProfile(null);
      setTransactions([]);
      setBudgets([]);
      setFinancialPlans([]);
      setRecurringTransactions([]);
      setSavingsGoals([]);
    }
  }, [user]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'icon'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' }); return; }

    try {
      await runTransaction(db, async (firestoreTransaction) => {
        const { date, financialPlanId, planItemId, ...restOfTransaction } = transaction;

        const transactionData = { ...restOfTransaction, date: Timestamp.fromDate(new Date(date)),
          createdAt: serverTimestamp(), userId: user.uid, financialPlanId: financialPlanId || null, planItemId: planItemId || null,
        };
        firestoreTransaction.set(doc(collection(db, 'users', user.uid, 'transactions')), transactionData);

        if (transaction.type === 'expense' && !Number.isInteger(transaction.amount)) {
            const roundupGoalRef = query(collection(db, 'users', user.uid, 'savingsGoals'), where('isRoundupGoal', '==', true));
            const roundupGoalSnap = await getDocs(roundupGoalRef);
            if (!roundupGoalSnap.empty) {
                const goalDoc = roundupGoalSnap.docs[0];
                const goal = goalDoc.data() as SavingsGoal;
                const roundupAmount = Math.ceil(transaction.amount) - transaction.amount;
                
                if (roundupAmount > 0) {
                    const newCurrentAmount = (goal.currentAmount || 0) + roundupAmount;
                    const newBadges = calculateNewBadges(goal, newCurrentAmount);
                    firestoreTransaction.update(goalDoc.ref, { 
                        currentAmount: newCurrentAmount,
                        badges: arrayUnion(...newBadges)
                    });
                }
            }
        }

        if (financialPlanId && planItemId) {
          const planRef = doc(db, 'users', user.uid, 'financialPlans', financialPlanId);
          const planDoc = await firestoreTransaction.get(planRef);
          if (!planDoc.exists()) throw new Error("Financial plan not found!");
          const planData = planDoc.data() as FinancialPlan;
          const updatedItems = planData.items.map(item =>
            item.id === planItemId ? { ...item, actualCost: (item.actualCost || 0) + transaction.amount } : item
          );
          const newTotalActualCost = updatedItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
          firestoreTransaction.update(planRef, { items: updatedItems, totalActualCost: newTotalActualCost });
        }
      });
      toast({ title: `${transaction.type === 'income' ? 'Income' : 'Expense'} Added` });
    } catch (error) {
      console.error('Error adding transaction: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not add transaction.';
      toast({ variant: 'destructive', title: 'Error', description: errorMessage });
    }
  };
  
  const updateTransaction = async (transactionId: string, updatedData: Partial<Transaction>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated' }); return; }
    try {
        await runTransaction(db, async (t) => {
            const txRef = doc(db, 'users', user.uid, 'transactions', transactionId);
            const oldTxSnap = await t.get(txRef);
            if (!oldTxSnap.exists()) throw new Error("Transaction document not found!");
            const oldTxData = oldTxSnap.data() as Transaction;
            
            if (oldTxData.financialPlanId && oldTxData.planItemId) {
                const oldPlanRef = doc(db, 'users', user.uid, 'financialPlans', oldTxData.financialPlanId);
                const oldPlanSnap = await t.get(oldPlanRef);
                if (oldPlanSnap.exists()) {
                    const plan = oldPlanSnap.data() as FinancialPlan;
                    t.update(oldPlanRef, { 
                      items: plan.items.map(i => i.id === oldTxData.planItemId ? { ...i, actualCost: Math.max(0, (i.actualCost || 0) - oldTxData.amount) } : i),
                      totalActualCost: Math.max(0, (plan.totalActualCost || 0) - oldTxData.amount) 
                    });
                }
            }
    
            const { financialPlanId: newPlanId, planItemId: newItemId, amount: newAmount } = updatedData;
            if (newPlanId && newItemId && newAmount) {
                const newPlanRef = doc(db, 'users', user.uid, 'financialPlans', newPlanId);
                const newPlanSnap = await t.get(newPlanRef);
                if (newPlanSnap.exists()) {
                    const plan = newPlanSnap.data() as FinancialPlan;
                    t.update(newPlanRef, {
                       items: plan.items.map(i => i.id === newItemId ? { ...i, actualCost: (i.actualCost || 0) + newAmount } : i),
                       totalActualCost: (plan.totalActualCost || 0) + newAmount
                    });
                }
            }
    
            const finalUpdateData: any = { ...updatedData };
            if (finalUpdateData.date) finalUpdateData.date = Timestamp.fromDate(new Date(finalUpdateData.date));
            t.update(txRef, finalUpdateData);
        });
        toast({ title: 'Transaction Updated' });
    } catch (error) {
        console.error('Error updating transaction:', error);
        toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
    }
};

const deleteTransaction = async (transactionId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated' }); return; }
    try {
        await runTransaction(db, async (t) => {
            const txRef = doc(db, 'users', user.uid, 'transactions', transactionId);
            const txSnap = await t.get(txRef);
            if (!txSnap.exists()) return;
            const txData = txSnap.data() as Transaction;
            
            if (txData.financialPlanId && txData.planItemId) {
                const planRef = doc(db, 'users', user.uid, 'financialPlans', txData.financialPlanId);
                const planSnap = await t.get(planRef);
                if (planSnap.exists()) {
                    const plan = planSnap.data() as FinancialPlan;
                     t.update(planRef, { 
                      items: plan.items.map(i => i.id === txData.planItemId ? { ...i, actualCost: Math.max(0, (i.actualCost || 0) - txData.amount) } : i),
                      totalActualCost: Math.max(0, (plan.totalActualCost || 0) - txData.amount) 
                    });
                }
            }
            t.delete(txRef);
        });
        toast({ title: 'Transaction Deleted' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
    }
};

  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'userId' | 'month' | 'currentSpend'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      const month = new Date().toISOString().slice(0, 7);
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        ...budget, month: month, currentSpend: 0, userId: user.uid, createdAt: serverTimestamp(),
      });
      toast({ title: 'Budget Added' });
    } catch (error) {
      console.error('Error adding budget: ', error);
      toast({ variant: 'destructive', title: 'Error adding budget' });
    }
  };

  const updateBudget = async (budgetId: string, data: Partial<Omit<Budget, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'budgets', budgetId), data);
      toast({ title: 'Budget Updated' });
    } catch (error) {
      console.error('Error updating budget: ', error);
      toast({ variant: 'destructive', title: 'Error updating budget' });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', budgetId));
      toast({ title: 'Budget Deleted' });
    } catch (error) {
      console.error('Error deleting budget: ', error);
      toast({ variant: 'destructive', title: 'Error deleting budget' });
    }
  };
  
  const addFinancialPlan = async (plan: Omit<FinancialPlan, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'financialPlans'), {
            ...plan, userId: user.uid, createdAt: serverTimestamp(),
        });
        toast({ title: 'Financial Plan Created!' });
    } catch (error) {
        console.error('Error creating plan:', error);
        toast({ variant: 'destructive', title: 'Error creating plan' });
    }
  }

  const updateFinancialPlan = async (planId: string, data: Partial<Omit<FinancialPlan, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid, 'financialPlans', planId), data);
        toast({ title: 'Financial Plan Updated' });
    } catch (error) {
        console.error('Error updating plan:', error);
        toast({ variant: 'destructive', title: 'Error updating plan' });
    }
  };

  const deleteFinancialPlan = async (planId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'financialPlans', planId));
        toast({ title: 'Financial Plan Deleted' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        toast({ variant: 'destructive', title: 'Error deleting plan' });
    }
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'recurringTransactions'), {
            ...transaction, userId: user.uid, isActive: true,
            startDate: Timestamp.fromDate(new Date(transaction.startDate)), createdAt: serverTimestamp(),
        });
        toast({ title: 'Recurring Transaction Added' });
    } catch (error) {
        console.error('Error adding recurring item:', error);
        toast({ variant: 'destructive', title: 'Error adding recurring item' });
    }
  };

  const updateRecurringTransaction = async (transactionId: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    const { startDate, ...restData } = data;
    const updateData: any = { ...restData };
    if (startDate) updateData.startDate = Timestamp.fromDate(new Date(startDate));
    try {
        await updateDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId), updateData);
        toast({ title: 'Recurring Transaction Updated' });
    } catch (error) {
        console.error('Error updating recurring item:', error);
        toast({ variant: 'destructive', title: 'Error updating recurring item' });
    }
  };

  const deleteRecurringTransaction = async (transactionId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId));
        toast({ title: 'Recurring Transaction Deleted' });
    } catch (error) {
        console.error('Error deleting recurring item:', error);
        toast({ variant: 'destructive', title: 'Error deleting recurring item' });
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'currentAmount' | 'badges'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated' }); return; }
    try {
        const goalsCollection = collection(db, 'users', user.uid, 'savingsGoals');
        const batch = writeBatch(db);

        if (goal.isRoundupGoal) {
            const q = query(goalsCollection, where("isRoundupGoal", "==", true));
            const existingRoundupGoals = await getDocs(q);
            existingRoundupGoals.forEach(doc => batch.update(doc.ref, { isRoundupGoal: false }));
        }

        const newGoalRef = doc(goalsCollection);
        batch.set(newGoalRef, {
            ...goal,
            currentAmount: 0,
            badges: [],
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
        
        await batch.commit();
        toast({ title: "Savings Goal Created!" });
    } catch (error) {
        console.error('Error adding savings goal:', error);
        toast({ variant: 'destructive', title: 'Error creating goal' });
    }
  };

  const updateSavingsGoal = async (goalId: string, data: Partial<Omit<SavingsGoal, 'id'>>) => {
     if (!user) { toast({ variant: 'destructive', title: 'Not authenticated' }); return; }
    try {
        const goalsCollection = collection(db, 'users', user.uid, 'savingsGoals');
        const batch = writeBatch(db);
        const goalRef = doc(goalsCollection, goalId);

        if (data.isRoundupGoal) {
            const q = query(goalsCollection, where("isRoundupGoal", "==", true));
            const existingRoundupGoals = await getDocs(q);
            existingRoundupGoals.forEach(doc => {
                if (doc.id !== goalId) {
                    batch.update(doc.ref, { isRoundupGoal: false });
                }
            });
        }
        
        const finalData = { ...data };
        if (finalData.deadline) (finalData as any).deadline = Timestamp.fromDate(new Date(finalData.deadline));

        batch.update(goalRef, finalData);
        await batch.commit();
        toast({ title: "Savings Goal Updated" });
    } catch (error) {
        console.error('Error updating savings goal:', error);
        toast({ variant: 'destructive', title: 'Error updating goal' });
    }
  };

  const deleteSavingsGoal = async (goalId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', goalId));
        toast({ title: "Savings Goal Deleted" });
    } catch (error) {
        console.error('Error deleting savings goal:', error);
        toast({ variant: 'destructive', title: 'Error deleting goal' });
    }
  };

  const calculateNewBadges = (goal: SavingsGoal, newCurrentAmount: number): Badge[] => {
    const newBadges: Badge[] = [];
    const now = new Date().toISOString();
    const existingBadgeNames = goal.badges.map(b => b.name);

    const milestones: { name: Badge['name'], percent: number }[] = [
        { name: 'First Saving', percent: 0 },
        { name: '25% Mark', percent: 25 },
        { name: '50% Mark', percent: 50 },
        { name: '75% Mark', percent: 75 },
        { name: 'Goal Achieved!', percent: 100 },
    ];
    
    if (goal.currentAmount === 0 && newCurrentAmount > 0 && !existingBadgeNames.includes('First Saving')) {
        newBadges.push({ name: 'First Saving', dateAchieved: now });
    }

    milestones.forEach(milestone => {
        if (milestone.percent > 0) {
            const threshold = goal.targetAmount * (milestone.percent / 100);
            if (newCurrentAmount >= threshold && goal.currentAmount < threshold && !existingBadgeNames.includes(milestone.name)) {
                newBadges.push({ name: milestone.name, dateAchieved: now });
            }
        }
    });

    return newBadges;
  }

  const updateUserPreferences = async (data: Partial<UserProfile>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
    } catch (error) {
      console.error('Error updating settings: ', error);
      toast({ variant: 'destructive', title: 'Error saving settings' });
    }
  };

  const addCustomCategory = async (category: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    if (allCategories.includes(category)) { toast({ variant: 'destructive', title: 'Category already exists.'}); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid), { customCategories: arrayUnion(category) });
        toast({ title: `Category "${category}" added.` });
    } catch (error) {
        console.error('Error adding category:', error);
        toast({ variant: 'destructive', title: 'Error adding category' });
    }
  }

  const deleteCustomCategory = async (category: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid), { customCategories: arrayRemove(category) });
        toast({ title: `Category "${category}" removed.` });
    } catch (error) {
        console.error('Error deleting category:', error);
        toast({ variant: 'destructive', title: 'Error deleting category' });
    }
  }

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AppContext.Provider
      value={{
        user, userProfile, loading, transactions, addTransaction, updateTransaction,
        deleteTransaction, logout, categories: categoryIcons, expenseCategories, incomeCategories, allCategories,
        addCustomCategory, deleteCustomCategory, budgets, addBudget, updateBudget, deleteBudget,
        financialPlans, addFinancialPlan, updateFinancialPlan, deleteFinancialPlan,
        updateUserPreferences, recurringTransactions, addRecurringTransaction,
        updateRecurringTransaction, deleteRecurringTransaction, savingsGoals,
        addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
