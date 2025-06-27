

'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { categories as categoryIcons, defaultExpenseCategories, defaultIncomeCategories } from '@/data/mock-data';
import type { Transaction, Budget, UserProfile, FinancialPlan, RecurringTransaction, SavingsGoal, Badge, Investment, Notification } from '@/types';
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
  limit,
  setDoc,
} from 'firebase/firestore';
import { estimateCarbonFootprint } from '@/lib/carbon';
import type { AnalyzeTaxesInput, AnalyzeTaxesOutput, GenerateInsightsInput, GenerateInsightsOutput, ParseReceiptInput, ParseReceiptOutput } from '@/ai/flows/analyze-taxes-flow';
import { analyzeTaxesAction, generateInsightsAction, parseReceiptAction } from '@/lib/actions';


export const FREE_TIER_LIMITS = {
    ocrScans: 30,
    recurringTransactions: 2,
    budgets: 3,
    financialPlans: 1,
    savingsGoals: 2,
    roundups: 5,
    taxReports: 1, // AI Tax Analysis
    taxDeductibleFlags: 5,
    voiceCommands: 5,
    customCategories: 3,
    investments: 3,
    bankAccounts: 1,
    bankTransactions: 10,
    expenseSplits: 3,
    monthlyReports: 1, // For the reports page
    monthlyInsights: 3, // For smart insights card
  };


interface AppContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isPremium: boolean;
  loading: boolean;
  transactions: Transaction[];
  deductibleTransactionsCount: number;
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
  investments: Investment[];
  addInvestment: (investment: Omit<Investment, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateInvestment: (investmentId: string, data: Partial<Omit<Investment, 'id'>>) => Promise<void>;
  deleteInvestment: (investmentId: string) => Promise<void>;
  formatCurrency: (amount: number) => string;
  notifications: Notification[];
  showNotification: (payload: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => void;
  markAllNotificationsAsRead: () => Promise<void>;
  upgradeToPremium: (plan: 'monthly' | 'yearly') => Promise<void>;
  downgradeFromPremium: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
  canRunTaxAnalysis: boolean;
  analyzeTaxesWithLimit: (input: AnalyzeTaxesInput) => Promise<AnalyzeTaxesOutput | { error: string } | undefined>;
  canGenerateReport: boolean;
  generateReportWithLimit: () => Promise<boolean>;
  canGenerateInsights: boolean;
  generateInsightsWithLimit: (input: GenerateInsightsInput) => Promise<GenerateInsightsOutput | { error: string } | undefined>;
  canScanReceipt: boolean;
  scanReceiptWithLimit: (input: ParseReceiptInput) => Promise<ParseReceiptOutput | { error: string } | undefined>;
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
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { toast } = useToast();
  
  const isPremium = useMemo(() => {
    if (!userProfile?.subscription?.expiryDate) {
        return userProfile?.subscription?.tier === 'premium' && userProfile?.subscription?.isActive === true;
    }
    const expiry = new Date(userProfile.subscription.expiryDate);
    return userProfile?.subscription?.tier === 'premium' && userProfile?.subscription?.isActive === true && expiry > new Date();
  }, [userProfile]);

  const canRunTaxAnalysis = useMemo(() => {
    if (isPremium) return true;
    if (!userProfile?.subscription.monthlyTaxReports) return true;
    const { count, month } = userProfile.subscription.monthlyTaxReports;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (month !== currentMonth) return true;
    return count < FREE_TIER_LIMITS.taxReports;
  }, [isPremium, userProfile]);

  const canGenerateReport = useMemo(() => {
    if (isPremium) return true;
    if (!userProfile?.subscription.monthlyReports) return true;
    const { count, month } = userProfile.subscription.monthlyReports;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (month !== currentMonth) return true;
    return count < FREE_TIER_LIMITS.monthlyReports;
  }, [isPremium, userProfile]);

  const canGenerateInsights = useMemo(() => {
    if (isPremium) return true;
    if (!userProfile?.subscription.monthlyInsights) return true;
    const { count, month } = userProfile.subscription.monthlyInsights;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (month !== currentMonth) return true;
    return count < FREE_TIER_LIMITS.monthlyInsights;
  }, [isPremium, userProfile]);

  const canScanReceipt = useMemo(() => {
    if (isPremium) return true;
    if (!userProfile?.subscription?.monthlyOcrScans) return true;
    const { count, month } = userProfile.subscription.monthlyOcrScans;
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (month !== currentMonth) return true;
    return count < FREE_TIER_LIMITS.ocrScans;
  }, [isPremium, userProfile]);

  const showNotification = async (payload: Omit<Notification, 'id' | 'createdAt' | 'isRead'>) => {
    if (!user) return; // Don't show notifications if not logged in

    // 1. Show the visual toast
    toast({
        title: payload.title,
        description: payload.description,
        variant: payload.type === 'error' ? 'destructive' : 'default',
    });

    // 2. Add to the notification center list in Firestore
    try {
        await addDoc(collection(db, 'users', user.uid, 'notifications'), {
            ...payload,
            isRead: false,
            createdAt: serverTimestamp(),
            userId: user.uid,
        });
    } catch (error) {
        console.error('Failed to save notification to Firestore:', error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) return;
    const notificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notificationsRef, where('isRead', '==', false));
    try {
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((doc) => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking notifications as read:", error);
    }
  };

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
  const deductibleTransactionsCount = useMemo(() => transactions.filter(t => t.isTaxDeductible).length, [transactions]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserProfile({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
          setLoading(false);
        } else {
            console.warn("User profile document not found for authenticated user. Creating one.");
            // Create a default user profile document if it doesn't exist
            const defaultProfile = {
                displayName: user.displayName || user.email?.split('@')[0] || 'User',
                email: user.email,
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
                currencyPreference: 'USD',
                darkModeBanner: false,
                notificationPreferences: {
                    budgetThreshold: true,
                    recurringPayment: true,
                },
                profilePictureURL: user.photoURL || null,
                subscription: {
                  tier: 'free' as const,
                  isActive: true,
                  expiryDate: null,
                },
                hasCompletedOnboarding: false,
                customCategories: [],
            };
            setDoc(userDocRef, defaultProfile).catch(err => {
                console.error("Failed to auto-create user profile:", err);
                // If creation fails, we're in a broken state, but we should still stop loading
                // to avoid an infinite spinner. The user will see the error message on the page.
                setLoading(false);
            });
            // The onSnapshot listener will fire again once the document is created,
            // which will then set the userProfile and setLoading(false).
        }
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

      const qInvestments = query(collection(db, 'users', user.uid, 'investments'), orderBy('createdAt', 'desc'));
      const unsubscribeInvestments = onSnapshot(qInvestments, (snapshot) => {
        const userInvestments: Investment[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), 
            purchaseDate: (doc.data().purchaseDate as Timestamp).toDate().toISOString(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as Investment));
        setInvestments(userInvestments);
      });

      const qNotifications = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
        const userNotifications: Notification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Notification));
        setNotifications(userNotifications);
      });


      return () => {
        unsubscribeProfile();
        unsubscribeTransactions();
        unsubscribeBudgets();
        unsubscribePlans();
        unsubscribeRecurring();
        unsubscribeGoals();
        unsubscribeInvestments();
        unsubscribeNotifications();
      };
    } else {
      setUserProfile(null);
      setTransactions([]);
      setBudgets([]);
      setFinancialPlans([]);
      setRecurringTransactions([]);
      setSavingsGoals([]);
      setInvestments([]);
      setNotifications([]);
    }
  }, [user]);

  const formatCurrency = useMemo(() => {
    return (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: userProfile?.currencyPreference || 'USD',
        }).format(amount);
    }
  }, [userProfile?.currencyPreference]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'icon'>) => {
    if (!user || !userProfile) { showNotification({ type: 'error', title: 'Authentication Error', description: 'You must be logged in.' }); return; }

    try {
      await runTransaction(db, async (firestoreTransaction) => {
        const userDocRef = doc(db, 'users', user.uid);
        const { date, financialPlanId, planItemId, isTaxDeductible, ...restOfTransaction } = transaction;
        const carbonFootprint = estimateCarbonFootprint(transaction);

        const transactionData = { ...restOfTransaction, date: Timestamp.fromDate(new Date(date)),
          createdAt: serverTimestamp(), userId: user.uid, financialPlanId: financialPlanId || null, planItemId: planItemId || null,
          isTaxDeductible: isTaxDeductible || false,
          carbonFootprint,
        };
        firestoreTransaction.set(doc(collection(db, 'users', user.uid, 'transactions')), transactionData);

        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyRoundups = userProfile.subscription.monthlyRoundups;
        const canRoundup = isPremium || (!monthlyRoundups || monthlyRoundups.month !== currentMonth || monthlyRoundups.count < FREE_TIER_LIMITS.roundups);
        
        if (canRoundup && transaction.type === 'expense' && !Number.isInteger(transaction.amount)) {
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

                    if (!isPremium) {
                        const newRoundupCount = (!monthlyRoundups || monthlyRoundups.month !== currentMonth) ? 1 : monthlyRoundups.count + 1;
                        firestoreTransaction.update(userDocRef, { 'subscription.monthlyRoundups': { count: newRoundupCount, month: currentMonth } });
                    }
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
      showNotification({ type: 'success', title: 'Transaction Added', description: `Added ${formatCurrency(transaction.amount)} for ${transaction.source}.` });
    } catch (error) {
      console.error('Error adding transaction: ', error);
      const errorMessage = error instanceof Error ? error.message : 'Could not add transaction.';
      showNotification({ type: 'error', title: 'Error', description: errorMessage });
    }
  };
  
  const updateTransaction = async (transactionId: string, updatedData: Partial<Transaction>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
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

            const carbonFootprint = estimateCarbonFootprint({ ...oldTxData, ...updatedData } as Omit<Transaction, 'id' | 'icon'>);
    
            const finalUpdateData: any = { ...updatedData, carbonFootprint };
            if (finalUpdateData.date) finalUpdateData.date = Timestamp.fromDate(new Date(finalUpdateData.date));
            t.update(txRef, finalUpdateData);
        });
        showNotification({ type: 'success', title: 'Transaction Updated', description: '' });
    } catch (error) {
        console.error('Error updating transaction:', error);
        showNotification({ type: 'error', title: 'Error', description: (error as Error).message });
    }
};

const deleteTransaction = async (transactionId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
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
        showNotification({ type: 'success', title: 'Transaction Deleted', description: '' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        showNotification({ type: 'error', title: 'Error', description: (error as Error).message });
    }
};

  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'userId' | 'month' | 'currentSpend'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      const month = new Date().toISOString().slice(0, 7);
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        ...budget, month: month, currentSpend: 0, userId: user.uid, createdAt: serverTimestamp(),
      });
      showNotification({ type: 'success', title: 'Budget Added', description: `New budget for ${budget.category} set to ${formatCurrency(budget.limit)}.` });
    } catch (error) {
      console.error('Error adding budget: ', error);
      showNotification({ type: 'error', title: 'Error adding budget', description: '' });
    }
  };

  const updateBudget = async (budgetId: string, data: Partial<Omit<Budget, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'budgets', budgetId), data);
      showNotification({ type: 'success', title: 'Budget Updated', description: '' });
    } catch (error) {
      console.error('Error updating budget: ', error);
      showNotification({ type: 'error', title: 'Error updating budget', description: '' });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', budgetId));
      showNotification({ type: 'success', title: 'Budget Deleted', description: '' });
    } catch (error) {
      console.error('Error deleting budget: ', error);
      showNotification({ type: 'error', title: 'Error deleting budget', description: '' });
    }
  };
  
  const addFinancialPlan = async (plan: Omit<FinancialPlan, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'financialPlans'), {
            ...plan, userId: user.uid, createdAt: serverTimestamp(),
        });
        showNotification({ type: 'success', title: 'Financial Plan Created!', description: `Your new plan "${plan.title}" is ready.` });
    } catch (error) {
        console.error('Error creating plan:', error);
        showNotification({ type: 'error', title: 'Error creating plan', description: '' });
    }
  }

  const updateFinancialPlan = async (planId: string, data: Partial<Omit<FinancialPlan, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid, 'financialPlans', planId), data);
        showNotification({ type: 'success', title: 'Financial Plan Updated', description: '' });
    } catch (error) {
        console.error('Error updating plan:', error);
        showNotification({ type: 'error', title: 'Error updating plan', description: '' });
    }
  };

  const deleteFinancialPlan = async (planId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'financialPlans', planId));
        showNotification({ type: 'success', title: 'Financial Plan Deleted', description: '' });
    } catch (error) {
        console.error('Error deleting plan:', error);
        showNotification({ type: 'error', title: 'Error deleting plan', description: '' });
    }
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'recurringTransactions'), {
            ...transaction, userId: user.uid, isActive: true,
            startDate: Timestamp.fromDate(new Date(transaction.startDate)), createdAt: serverTimestamp(),
        });
        showNotification({ type: 'success', title: 'Recurring Transaction Added', description: `Scheduled "${transaction.title}".` });
    } catch (error) {
        console.error('Error adding recurring item:', error);
        showNotification({ type: 'error', title: 'Error adding recurring item', description: '' });
    }
  };

  const updateRecurringTransaction = async (transactionId: string, data: Partial<Omit<RecurringTransaction, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    const { startDate, ...restData } = data;
    const updateData: any = { ...restData };
    if (startDate) updateData.startDate = Timestamp.fromDate(new Date(startDate));
    try {
        await updateDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId), updateData);
        showNotification({ type: 'success', title: 'Recurring Transaction Updated', description: '' });
    } catch (error) {
        console.error('Error updating recurring item:', error);
        showNotification({ type: 'error', title: 'Error updating recurring item', description: '' });
    }
  };

  const deleteRecurringTransaction = async (transactionId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId));
        showNotification({ type: 'success', title: 'Recurring Transaction Deleted', description: '' });
    } catch (error) {
        console.error('Error deleting recurring item:', error);
        showNotification({ type: 'error', title: 'Error deleting recurring item', description: '' });
    }
  };

  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id' | 'userId' | 'createdAt' | 'currentAmount' | 'badges'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
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
        showNotification({ type: 'success', title: 'Savings Goal Created!', description: `You're on your way to saving for "${goal.title}".` });
    } catch (error) {
        console.error('Error adding savings goal:', error);
        showNotification({ type: 'error', title: 'Error creating goal', description: '' });
    }
  };

  const updateSavingsGoal = async (goalId: string, data: Partial<Omit<SavingsGoal, 'id'>>) => {
     if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
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
        showNotification({ type: 'success', title: 'Savings Goal Updated', description: '' });
    } catch (error) {
        console.error('Error updating savings goal:', error);
        showNotification({ type: 'error', title: 'Error updating goal', description: '' });
    }
  };

  const deleteSavingsGoal = async (goalId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', goalId));
        showNotification({ type: 'success', title: 'Savings Goal Deleted', description: '' });
    } catch (error) {
        console.error('Error deleting savings goal:', error);
        showNotification({ type: 'error', title: 'Error deleting goal', description: '' });
    }
  };

  const addInvestment = async (investment: Omit<Investment, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'investments'), {
            ...investment,
            userId: user.uid,
            purchaseDate: Timestamp.fromDate(new Date(investment.purchaseDate)),
            createdAt: serverTimestamp(),
        });
        showNotification({ type: 'success', title: 'Investment Added', description: `Added ${investment.name} to your portfolio.` });
    } catch (error) {
        console.error('Error adding investment:', error);
        showNotification({ type: 'error', title: 'Error adding investment', description: '' });
    }
  };

  const updateInvestment = async (investmentId: string, data: Partial<Omit<Investment, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    const { purchaseDate, ...restData } = data;
    const updateData: any = { ...restData };
    if (purchaseDate) updateData.purchaseDate = Timestamp.fromDate(new Date(purchaseDate));

    try {
        await updateDoc(doc(db, 'users', user.uid, 'investments', investmentId), updateData);
        showNotification({ type: 'success', title: 'Investment Updated', description: '' });
    } catch (error) {
        console.error('Error updating investment:', error);
        showNotification({ type: 'error', title: 'Error updating investment', description: '' });
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'investments', investmentId));
        showNotification({ type: 'success', title: 'Investment Deleted', description: '' });
    } catch (error) {
        console.error('Error deleting investment:', error);
        showNotification({ type: 'error', title: 'Error deleting investment', description: '' });
    }
  };


  const calculateNewBadges = (goal: SavingsGoal, newCurrentAmount: number): Badge[] => {
    const newBadges: Badge[] = [];
    const now = new Date().toISOString();
    const existingBadgeNames = goal.badges.map(b => b.name);

    let milestones: { name: Badge['name'], percent: number }[] = [
        { name: 'First Saving', percent: 0 },
        { name: '25% Mark', percent: 25 },
        { name: '50% Mark', percent: 50 },
        { name: '75% Mark', percent: 75 },
        { name: 'Goal Achieved!', percent: 100 },
    ];

    if (!isPremium) {
        // Free users only get the 50% badge
        milestones = [{ name: '50% Mark', percent: 50 }];
    }
    
    if ((isPremium || newCurrentAmount === 0) && goal.currentAmount === 0 && newCurrentAmount > 0 && !existingBadgeNames.includes('First Saving')) {
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
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      const { subscription, ...restData } = data; // Prevent direct subscription changes here
      await setDoc(doc(db, 'users', user.uid), restData, { merge: true });
      showNotification({ type: 'success', title: 'Settings Saved', description: 'Your preferences have been updated.' });
    } catch (error) {
      console.error('Error updating settings: ', error);
      showNotification({ type: 'error', title: 'Error saving settings', description: '' });
    }
  };

  const markOnboardingComplete = async () => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { hasCompletedOnboarding: true }, { merge: true });
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
    }
  };

  const upgradeToPremium = async (plan: 'monthly' | 'yearly') => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      const newExpiry = new Date();
      if (plan === 'yearly') {
        newExpiry.setFullYear(newExpiry.getFullYear() + 1);
      } else {
        newExpiry.setMonth(newExpiry.getMonth() + 1);
      }

      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        subscription: {
          tier: 'premium',
          isActive: true,
          expiryDate: newExpiry.toISOString(),
          planType: plan,
        }
      }, { merge: true });

      showNotification({ type: 'success', title: 'Upgrade Successful!', description: 'Welcome to FiscalFlow Premium.' });
    } catch (error) {
      console.error('Error upgrading to premium: ', error);
      showNotification({ type: 'error', title: 'Upgrade Failed', description: 'Could not update your subscription.' });
    }
  };
  
  const downgradeFromPremium = async () => {
    if (!user || !userProfile) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const currentSub = userProfile.subscription || {};

        await setDoc(userDocRef, {
            subscription: {
                ...currentSub,
                tier: 'free',
                isActive: false,
                planType: null,
            }
        }, { merge: true });

        showNotification({ type: 'info', title: 'Subscription Cancelled', description: 'Your Premium features will be disabled. We hope to see you back!' });
    } catch (error) {
        console.error('Error downgrading from premium: ', error);
        showNotification({ type: 'error', title: 'Cancellation Failed', description: 'Could not update your subscription.' });
    }
  };

  const addCustomCategory = async (category: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    if (!isPremium && (userProfile?.customCategories?.length || 0) >= FREE_TIER_LIMITS.customCategories) { 
        showNotification({ type: 'error', title: 'Limit Reached', description: `Free users can add up to ${FREE_TIER_LIMITS.customCategories} custom categories. Upgrade for more.` }); 
        return; 
    }
    if (allCategories.includes(category)) { showNotification({ type: 'error', title: 'Category already exists.', description: '' }); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid), { customCategories: arrayUnion(category) });
        showNotification({ type: 'success', title: `Category "${category}" added.`, description: '' });
    } catch (error) {
        console.error('Error adding category:', error);
        showNotification({ type: 'error', title: 'Error adding category', description: '' });
    }
  }

  const deleteCustomCategory = async (category: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid), { customCategories: arrayRemove(category) });
        showNotification({ type: 'success', title: `Category "${category}" removed.`, description: '' });
    } catch (error) {
        console.error('Error deleting category:', error);
        showNotification({ type: 'error', title: 'Error deleting category', description: '' });
    }
  }

  const analyzeTaxesWithLimit = async (input: AnalyzeTaxesInput): Promise<AnalyzeTaxesOutput | { error: string } | undefined> => {
    if (!user || !userProfile) { 
      showNotification({ type: 'error', title: 'Not authenticated', description: '' }); 
      return { error: 'Not authenticated' };
    }

    if (!canRunTaxAnalysis) {
        showNotification({ type: 'error', title: 'Limit Reached', description: 'You have used your free tax analysis for this month.' });
        return { error: 'Limit Reached' };
    }

    const result = await analyzeTaxesAction(input);

    if (!('error' in result) && !isPremium) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyReports = userProfile.subscription.monthlyTaxReports;
        const newCount = (!monthlyReports || monthlyReports.month !== currentMonth) ? 1 : monthlyReports.count + 1;
        await updateDoc(doc(db, 'users', user.uid), {
            'subscription.monthlyTaxReports': { count: newCount, month: currentMonth }
        });
    }

    return result;
  }

  const generateReportWithLimit = async (): Promise<boolean> => {
    if (!user || !userProfile) { return false; }
    if (!canGenerateReport) {
        showNotification({ type: 'error', title: 'Limit Reached', description: 'You have used your free report generation for this month.' });
        return false;
    }
    if (!isPremium) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyReports = userProfile.subscription.monthlyReports;
        const newCount = (!monthlyReports || monthlyReports.month !== currentMonth) ? 1 : (monthlyReports.count || 0) + 1;
        await updateDoc(doc(db, 'users', user.uid), {
            'subscription.monthlyReports': { count: newCount, month: currentMonth }
        });
    }
    return true;
  }
  
  const generateInsightsWithLimit = async (input: GenerateInsightsInput): Promise<GenerateInsightsOutput | { error: string } | undefined> => {
    if (!user || !userProfile) { return { error: 'Not authenticated' }; }
    if (!canGenerateInsights) {
        return { error: 'Limit Reached' };
    }

    const result = await generateInsightsAction(input);

    if (!('error' in result) && !isPremium) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyInsights = userProfile.subscription.monthlyInsights;
        const newCount = (!monthlyInsights || monthlyInsights.month !== currentMonth) ? 1 : (monthlyInsights.count || 0) + 1;
        await updateDoc(doc(db, 'users', user.uid), {
            'subscription.monthlyInsights': { count: newCount, month: currentMonth }
        });
    }

    return result;
  }

  const scanReceiptWithLimit = async (input: ParseReceiptInput): Promise<ParseReceiptOutput | { error: string } | undefined> => {
    if (!user || !userProfile) { 
        showNotification({ type: 'error', title: 'Not authenticated', description: '' });
        return { error: 'Not authenticated' };
    }
    if (!canScanReceipt) {
        showNotification({ type: 'error', title: 'Limit Reached', description: `You have used your ${FREE_TIER_LIMITS.ocrScans} free receipt scans for this month.` });
        return { error: 'Limit Reached' };
    }

    const result = await parseReceiptAction(input);

    if (!('error' in result) && !isPremium) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyScans = userProfile.subscription.monthlyOcrScans;
        const newCount = (!monthlyScans || monthlyScans.month !== currentMonth) ? 1 : (monthlyScans.count || 0) + 1;
        await updateDoc(doc(db, 'users', user.uid), {
            'subscription.monthlyOcrScans': { count: newCount, month: currentMonth }
        });
    }
    
    return result;
  };


  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AppContext.Provider
      value={{
        user, userProfile, isPremium, loading, transactions, deductibleTransactionsCount, addTransaction, updateTransaction,
        deleteTransaction, logout, categories: categoryIcons, expenseCategories, incomeCategories, allCategories,
        addCustomCategory, deleteCustomCategory, budgets, addBudget, updateBudget, deleteBudget,
        financialPlans, addFinancialPlan, updateFinancialPlan, deleteFinancialPlan,
        updateUserPreferences, recurringTransactions, addRecurringTransaction,
        updateRecurringTransaction, deleteRecurringTransaction, savingsGoals,
        addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, 
        investments, addInvestment, updateInvestment, deleteInvestment,
        formatCurrency,
        notifications, showNotification, markAllNotificationsAsRead,
        upgradeToPremium, downgradeFromPremium, markOnboardingComplete,
        canRunTaxAnalysis, analyzeTaxesWithLimit,
        canGenerateReport, generateReportWithLimit,
        canGenerateInsights, generateInsightsWithLimit,
        canScanReceipt, scanReceiptWithLimit,
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
