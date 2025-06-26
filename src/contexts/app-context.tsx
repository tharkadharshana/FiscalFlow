'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { categories as mockCategories } from '@/data/mock-data';
import type { Transaction, Budget, UserProfile, FinancialPlan, RecurringTransaction } from '@/types';
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
} from 'firebase/firestore';

interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'icon'>) => void;
  logout: () => Promise<void>;
  categories: Record<string, React.ComponentType<{ className?: string }>>;
  budgets: Budget[];
  addBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'userId'>) => Promise<void>;
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

  useEffect(() => {
    if (user) {
      setLoading(true);
      // Listener for user profile
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserProfile({ uid: doc.id, ...doc.data() } as UserProfile);
        }
        setLoading(false);
      });

      // Listener for transactions
      const qTransactions = query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('date', 'desc')
      );
      const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
        const userTransactions: Transaction[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userTransactions.push({
            id: doc.id,
            ...data,
            date: data.date.toDate().toISOString(),
            icon: mockCategories[data.category] || mockCategories['Food'],
          } as Transaction);
        });
        setTransactions(userTransactions);
      });

      // Listener for budgets
      const qBudgets = query(collection(db, 'users', user.uid, 'budgets'));
      const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
        const userBudgets: Budget[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userBudgets.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString(),
          } as Budget);
        });
        setBudgets(userBudgets);
      });
      
      // Listener for financial plans
      const qPlans = query(collection(db, 'users', user.uid, 'financialPlans'), orderBy('createdAt', 'desc'));
      const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
        const userPlans: FinancialPlan[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userPlans.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate().toISOString(),
          } as FinancialPlan);
        });
        setFinancialPlans(userPlans);
      });

      // Listener for recurring transactions
      const qRecurring = query(collection(db, 'users', user.uid, 'recurringTransactions'), orderBy('createdAt', 'desc'));
      const unsubscribeRecurring = onSnapshot(qRecurring, (snapshot) => {
        const userRecurring: RecurringTransaction[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            userRecurring.push({
                id: doc.id,
                ...data,
                startDate: data.startDate.toDate().toISOString(),
                lastGeneratedDate: data.lastGeneratedDate?.toDate().toISOString(),
                createdAt: data.createdAt?.toDate().toISOString(),
            } as RecurringTransaction);
        });
        setRecurringTransactions(userRecurring);
      });


      return () => {
        unsubscribeProfile();
        unsubscribeTransactions();
        unsubscribeBudgets();
        unsubscribePlans();
        unsubscribeRecurring();
      };
    } else {
      // Clear all data on logout
      setUserProfile(null);
      setTransactions([]);
      setBudgets([]);
      setFinancialPlans([]);
      setRecurringTransactions([]);
    }
  }, [user]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'icon'>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to add a transaction.',
      });
      return;
    }

    try {
      const { date, financialPlanId, planItemId, ...restOfTransaction } = transaction;

      // Firestore transaction to ensure atomicity
      await runTransaction(db, async (firestoreTransaction) => {
        const transactionsCollection = collection(db, 'users', user.uid, 'transactions');
        
        // 1. Create the new transaction document
        const transactionData = {
          ...restOfTransaction,
          date: Timestamp.fromDate(new Date(date)),
          createdAt: serverTimestamp(),
          userId: user.uid,
          financialPlanId: financialPlanId || null,
          planItemId: planItemId || null,
        };
        firestoreTransaction.set(doc(transactionsCollection), transactionData);

        // 2. If linked to a plan, update the plan
        if (financialPlanId && planItemId) {
          const planRef = doc(db, 'users', user.uid, 'financialPlans', financialPlanId);
          const planDoc = await firestoreTransaction.get(planRef);

          if (!planDoc.exists()) {
            throw new Error("Financial plan not found!");
          }

          const planData = planDoc.data() as FinancialPlan;
          let itemUpdated = false;

          const updatedItems = planData.items.map(item => {
            if (item.id === planItemId) {
              itemUpdated = true;
              // Add new transaction amount to existing actual cost
              return { ...item, actualCost: (item.actualCost || 0) + transaction.amount };
            }
            return item;
          });

          if (itemUpdated) {
            const newTotalActualCost = updatedItems.reduce((sum, item) => sum + (item.actualCost || 0), 0);
            firestoreTransaction.update(planRef, { 
              items: updatedItems,
              totalActualCost: newTotalActualCost 
            });
          }
        }
      });
      
      toast({
        title: `${transaction.type === 'income' ? 'Income' : 'Expense'} Added`,
        description: `${transaction.source} - $${transaction.amount.toFixed(2)}`,
      });

    } catch (error) {
      console.error('Error adding transaction: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not add transaction.';
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  };
  
  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'userId'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        ...budget,
        userId: user.uid,
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Budget Added Successfully' });
    } catch (error) {
      console.error('Error adding budget: ', error);
      toast({ variant: 'destructive', title: 'Error adding budget' });
    }
  };

  const updateBudget = async (budgetId: string, data: Partial<Omit<Budget, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'budgets', budgetId), data);
      toast({ title: 'Budget Updated Successfully' });
    } catch (error) {
      console.error('Error updating budget: ', error);
      toast({ variant: 'destructive', title: 'Error updating budget' });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', budgetId));
      toast({ title: 'Budget Deleted Successfully' });
    } catch (error) {
      console.error('Error deleting budget: ', error);
      toast({ variant: 'destructive', title: 'Error deleting budget' });
    }
  };
  
  const addFinancialPlan = async (plan: Omit<FinancialPlan, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'financialPlans'), {
            ...plan,
            userId: user.uid,
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Financial Plan Created!' });
    } catch (error) {
        console.error('Error creating financial plan:', error);
        toast({ variant: 'destructive', title: 'Error creating plan' });
    }
  }

  const updateFinancialPlan = async (planId: string, data: Partial<Omit<FinancialPlan, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid, 'financialPlans', planId), data);
        toast({ title: 'Financial Plan Updated' });
    } catch (error) {
        console.error('Error updating financial plan:', error);
        toast({ variant: 'destructive', title: 'Error updating plan' });
    }
  };

  const deleteFinancialPlan = async (planId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'financialPlans', planId));
        toast({ title: 'Financial Plan Deleted' });
    } catch (error) {
        console.error('Error deleting financial plan:', error);
        toast({ variant: 'destructive', title: 'Error deleting plan' });
    }
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'recurringTransactions'), {
            ...transaction,
            userId: user.uid,
            isActive: true,
            startDate: Timestamp.fromDate(new Date(transaction.startDate)),
            createdAt: serverTimestamp(),
        });
        toast({ title: 'Recurring Transaction Added' });
    } catch (error) {
        console.error('Error adding recurring transaction:', error);
        toast({ variant: 'destructive', title: 'Error adding recurring item' });
    }
  };

  const updateRecurringTransaction = async (transactionId: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    const { startDate, ...restData } = data;
    const updateData: any = { ...restData };
    if (startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(startDate));
    }
    try {
        await updateDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId), updateData);
        toast({ title: 'Recurring Transaction Updated' });
    } catch (error) {
        console.error('Error updating recurring transaction:', error);
        toast({ variant: 'destructive', title: 'Error updating recurring item' });
    }
  };

  const deleteRecurringTransaction = async (transactionId: string) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId));
        toast({ title: 'Recurring Transaction Deleted' });
    } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        toast({ variant: 'destructive', title: 'Error deleting recurring item' });
    }
  };

  const updateUserPreferences = async (data: Partial<UserProfile>) => {
    if (!user) { toast({ variant: 'destructive', title: 'Not authenticated'}); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid), data);
    } catch (error) {
      console.error('Error updating settings: ', error);
      toast({ variant: 'destructive', title: 'Error saving settings' });
    }
  };


  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AppContext.Provider
      value={{
        user,
        userProfile,
        loading,
        transactions,
        addTransaction,
        logout,
        categories: mockCategories,
        budgets,
        addBudget,
        updateBudget,
        deleteBudget,
        financialPlans,
        addFinancialPlan,
        updateFinancialPlan,
        deleteFinancialPlan,
        updateUserPreferences,
        recurringTransactions,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
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
