
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import { categories as categoryIcons, defaultExpenseCategories, defaultIncomeCategories } from '@/data/mock-data';
import type { Transaction, Budget, UserProfile, TripPlan, RecurringTransaction, SavingsGoal, Badge as BadgeType, Investment, Notification, TripItem, Checklist, ChecklistItem, ChecklistTemplate } from '@/types';
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
import { analyzeTaxesAction, createMonthlyBudgetsAction, generateInsightsAction, parseDocumentAction, parseReceiptAction, createTripPlanAction } from '@/lib/actions';
import { logger } from '@/lib/logger';
import { nanoid } from 'nanoid';
import type { AnalyzeTaxesInput, GenerateInsightsInput, GenerateInsightsOutput, ParseReceiptInput, ParseReceiptOutput } from '@/types/schemas';
import { startOfMonth, endOfMonth, subMonths, addMonths, setDate as setDateFns, getDate } from 'date-fns';


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
  tripPlans: TripPlan[];
  addTripPlan: (plan: Omit<TripPlan, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateTripPlan: (planId: string, data: Partial<Omit<TripPlan, 'id'>>) => Promise<void>;
  deleteTripPlan: (planId: string) => Promise<void>;
  startTrip: (tripId: string) => Promise<void>;
  endTrip: (tripId: string) => Promise<void>;
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
  canRunTaxAnalysis: boolean;
  analyzeTaxesWithLimit: (input: Omit<AnalyzeTaxesInput, 'countryCode' | 'transactions' | 'investments' | 'savingsGoals'>) => Promise<AnalyzeTaxesOutput | { error: string } | undefined>;
  canGenerateReport: boolean;
  generateReportWithLimit: () => Promise<boolean>;
  canGenerateInsights: boolean;
  generateInsightsWithLimit: (input: GenerateInsightsInput) => Promise<GenerateInsightsOutput | { error: string } | undefined>;
  canScanReceipt: boolean;
  scanReceiptWithLimit: (input: ParseReceiptInput) => Promise<ParseReceiptOutput | { error: string } | undefined>;
  checklists: Checklist[];
  addChecklist: (checklist: Omit<Checklist, 'id' | 'userId' | 'createdAt' | 'icon'>) => Promise<void>;
  updateChecklist: (checklistId: string, data: Partial<Omit<Checklist, 'id' | 'icon' | 'iconName'>>) => Promise<void>;
  deleteChecklist: (checklistId: string) => Promise<void>;
  checklistTemplates: ChecklistTemplate[];
  createTemplateFromChecklist: (checklist: Checklist) => Promise<void>;
  deleteChecklistTemplate: (templateId: string) => Promise<void>;
  transactionsForCurrentCycle: Transaction[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Helper function to calculate the financial cycle date range
const getFinancialCycle = (startDay: number): { startDate: Date, endDate: Date, cycleMonthStr: string } => {
    const today = new Date();
    const currentDay = getDate(today);

    let startDate: Date;
    let endDate: Date;

    if (currentDay >= startDay) {
        // We are in the current month's cycle
        startDate = setDateFns(today, startDay);
        endDate = setDateFns(addMonths(today, 1), startDay - 1);
    } else {
        // We are in the previous month's cycle
        startDate = setDateFns(subMonths(today, 1), startDay);
        endDate = setDateFns(today, startDay - 1);
    }
    
    // YYYY-MM representation for budget querying
    const cycleMonthStr = startDate.toISOString().slice(0, 7);

    return { startDate, endDate, cycleMonthStr };
}


export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]); // All-time transactions
  const [transactionsForCurrentCycle, setTransactionsForCurrentCycle] = useState<Transaction[]>([]); // Cycle-specific transactions
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [tripPlans, setTripPlans] = useState<TripPlan[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistTemplates, setChecklistTemplates] = useState<ChecklistTemplate[]>([]);
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
        logger.error('Failed to save notification to Firestore', error as Error, { notificationTitle: payload.title });
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
        logger.info('Marked all notifications as read');
    } catch (error) {
        logger.error("Error marking notifications as read", error as Error);
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
  const deductibleTransactionsCount = useMemo(() => allTransactions.filter(t => t.isTaxDeductible).length, [allTransactions]);

  useEffect(() => {
    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribeProfile = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data();
          // Set default for showOnboardingOnLogin if it's missing
          if (profileData.showOnboardingOnLogin === undefined) {
            profileData.showOnboardingOnLogin = true;
          }
          if (profileData.financialCycleStartDay === undefined) {
            profileData.financialCycleStartDay = 1;
          }
          setUserProfile({ uid: docSnap.id, ...profileData } as UserProfile);
          setLoading(false);
        } else {
            logger.warn("User profile document not found for authenticated user. Login form should handle creation.", { userId: user.uid });
            setLoading(false);
        }
      }, (error) => {
        logger.error("Error subscribing to user profile", error);
        setLoading(false);
      });

      const qTransactions = query(collection(db, 'users', user.uid, 'transactions'), orderBy('date', 'desc'));
      const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
        const userTransactions: Transaction[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate().toISOString(),
            icon: categoryIcons[doc.data().category] || categoryIcons['Food'],
        } as Transaction));
        setAllTransactions(userTransactions);
      }, (error) => logger.error("Error subscribing to transactions", error));

      const qRecurring = query(collection(db, 'users', user.uid, 'recurringTransactions'), orderBy('createdAt', 'desc'));
      const unsubscribeRecurring = onSnapshot(qRecurring, (snapshot) => {
        const userRecurring: RecurringTransaction[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), startDate: (doc.data().startDate as Timestamp).toDate().toISOString(),
            lastGeneratedDate: doc.data().lastGeneratedDate?.toDate().toISOString(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as RecurringTransaction));
        setRecurringTransactions(userRecurring);
      }, (error) => logger.error("Error subscribing to recurring transactions", error));

      const qGoals = query(collection(db, 'users', user.uid, 'savingsGoals'), orderBy('createdAt', 'desc'));
      const unsubscribeGoals = onSnapshot(qGoals, (snapshot) => {
        const userGoals: SavingsGoal[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), deadline: doc.data().deadline,
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as SavingsGoal));
        setSavingsGoals(userGoals);
      }, (error) => logger.error("Error subscribing to savings goals", error));

      const qInvestments = query(collection(db, 'users', user.uid, 'investments'), orderBy('createdAt', 'desc'));
      const unsubscribeInvestments = onSnapshot(qInvestments, (snapshot) => {
        const userInvestments: Investment[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), 
            purchaseDate: (doc.data().purchaseDate as Timestamp).toDate().toISOString(),
            createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as Investment));
        setInvestments(userInvestments);
      }, (error) => logger.error("Error subscribing to investments", error));

      const qNotifications = query(collection(db, 'users', user.uid, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
      const unsubscribeNotifications = onSnapshot(qNotifications, (snapshot) => {
        const userNotifications: Notification[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Notification));
        setNotifications(userNotifications);
      }, (error) => logger.error("Error subscribing to notifications", error));

      const qChecklists = query(collection(db, 'users', user.uid, 'checklists'), orderBy('createdAt', 'desc'));
      const unsubscribeChecklists = onSnapshot(qChecklists, (snapshot) => {
        const userChecklists: Checklist[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(),
            iconName: doc.data().iconName,
            icon: categoryIcons[doc.data().iconName] || categoryIcons['ShoppingCart'],
            createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
        } as Checklist));
        setChecklists(userChecklists);
      }, (error) => logger.error("Error subscribing to checklists", error));

      const qTemplates = query(collection(db, 'users', user.uid, 'checklistTemplates'), orderBy('createdAt', 'desc'));
      const unsubscribeTemplates = onSnapshot(qTemplates, (snapshot) => {
        const userTemplates: ChecklistTemplate[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(),
            iconName: doc.data().iconName,
            icon: categoryIcons[doc.data().iconName] || categoryIcons['ShoppingCart'],
            createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString(),
        } as ChecklistTemplate));
        setChecklistTemplates(userTemplates);
      }, (error) => logger.error("Error subscribing to checklist templates", error));
      
      // Stop listening to budgets here; it will be handled in the cycle effect
      const qPlans = query(collection(db, 'users', user.uid, 'tripPlans'), orderBy('createdAt', 'desc'));
      const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
        const userPlans: TripPlan[] = snapshot.docs.map(doc => ({
            id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString(),
        } as TripPlan));
        setTripPlans(userPlans);
      }, (error) => logger.error("Error subscribing to trip plans", error));


      return () => {
        unsubscribeProfile();
        unsubscribeTransactions();
        unsubscribePlans();
        unsubscribeRecurring();
        unsubscribeGoals();
        unsubscribeInvestments();
        unsubscribeNotifications();
        unsubscribeChecklists();
        unsubscribeTemplates();
      };
    } else {
      setUserProfile(null);
      setAllTransactions([]);
      setTransactionsForCurrentCycle([]);
      setBudgets([]);
      setTripPlans([]);
      setRecurringTransactions([]);
      setSavingsGoals([]);
      setInvestments([]);
      setNotifications([]);
      setChecklists([]);
      setChecklistTemplates([]);
    }
  }, [user]);

  // New effect to manage data scoped to the financial cycle
  useEffect(() => {
    if (user && userProfile) {
        const startDay = userProfile.financialCycleStartDay || 1;
        const { startDate, endDate, cycleMonthStr } = getFinancialCycle(startDay);

        const cycleTransactions = allTransactions.filter(t => {
            const txDate = new Date(t.date);
            return txDate >= startDate && txDate <= endDate;
        });
        setTransactionsForCurrentCycle(cycleTransactions);

        const qBudgets = query(collection(db, 'users', user.uid, 'budgets'), where('month', '==', cycleMonthStr));
        const unsubscribeBudgets = onSnapshot(qBudgets, (snapshot) => {
            const userBudgets: Budget[] = snapshot.docs.map(doc => ({
                id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toISOString(),
            } as Budget));
            setBudgets(userBudgets);
        }, (error) => logger.error("Error subscribing to budgets", error));

        return () => {
            unsubscribeBudgets();
        };
    }
  }, [user, userProfile, allTransactions]);


  const formatCurrency = useMemo(() => {
    return (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: userProfile?.currencyPreference || 'USD',
        }).format(amount);
    }
  }, [userProfile?.currencyPreference]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'icon'>) => {
    if (!user || !userProfile) {
      showNotification({ type: 'error', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
  
    try {
      await runTransaction(db, async (firestoreTransaction) => {
        const userDocRef = doc(db, 'users', user.uid);
  
        // Destructure and assign activeTripId if it exists
        const { date, tripItemId, isTaxDeductible, items, checklistId, checklistItemId, ...restOfTransaction } = transaction;
        let finalTripId = transaction.tripId;
        if (userProfile.activeTripId && !finalTripId) {
            finalTripId = userProfile.activeTripId;
        }
  
        const finalAmount = items && items.length > 0
          ? items.reduce((sum, item) => sum + item.amount, 0)
          : transaction.amount;
  
        // --- READS FIRST ---
        let planRef: any, planDoc: any, roundupGoalSnap: any, checklistRef: any, checklistDoc: any;
  
        if (finalTripId) {
          planRef = doc(db, 'users', user.uid, 'tripPlans', finalTripId);
          planDoc = await firestoreTransaction.get(planRef);
        }

        if (checklistId) {
            checklistRef = doc(db, 'users', user.uid, 'checklists', checklistId);
            checklistDoc = await firestoreTransaction.get(checklistRef);
        }
  
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyRoundups = userProfile.subscription.monthlyRoundups;
        const canRoundup = isPremium || (!monthlyRoundups || monthlyRoundups.month !== currentMonth || monthlyRoundups.count < FREE_TIER_LIMITS.roundups);
  
        if (canRoundup && transaction.type === 'expense' && !Number.isInteger(finalAmount)) {
          const roundupGoalQuery = query(collection(db, 'users', user.uid, 'savingsGoals'), where('isRoundupGoal', '==', true));
          roundupGoalSnap = await getDocs(roundupGoalQuery);
        }
  
        // --- WRITES SECOND ---
        const carbonFootprint = estimateCarbonFootprint({ ...transaction, amount: finalAmount });
        const newTransactionRef = doc(collection(db, 'users', user.uid, 'transactions'));
        firestoreTransaction.set(newTransactionRef, {
          ...restOfTransaction,
          amount: finalAmount,
          items: items || [],
          date: Timestamp.fromDate(new Date(date)),
          createdAt: serverTimestamp(),
          userId: user.uid,
          tripId: finalTripId || null,
          tripItemId: tripItemId || null,
          isTaxDeductible: isTaxDeductible || false,
          carbonFootprint,
          checklistId: checklistId || null,
          checklistItemId: checklistItemId || null,
        });
  
        if (roundupGoalSnap && !roundupGoalSnap.empty) {
          const goalDoc = roundupGoalSnap.docs[0];
          const goal = goalDoc.data() as SavingsGoal;
          const roundupAmount = Math.ceil(finalAmount) - finalAmount;
  
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
  
        if (planRef && planDoc?.exists()) {
          const planData = planDoc.data() as TripPlan;
          const newTotalActualCost = (planData.totalActualCost || 0) + finalAmount;
          const updateData: { totalActualCost: number, items?: TripItem[] } = { totalActualCost: newTotalActualCost };
  
          if (tripItemId) {
            updateData.items = planData.items.map(item =>
              item.id === tripItemId ? { ...item, actualCost: (item.actualCost || 0) + finalAmount } : item
            );
          }
          firestoreTransaction.update(planRef, updateData);
        }

        if (checklistRef && checklistDoc?.exists() && checklistItemId) {
            const checklistData = checklistDoc.data() as Checklist;
            const updatedItems = checklistData.items.map(item => 
                item.id === checklistItemId ? { ...item, isCompleted: true } : item
            );
            firestoreTransaction.update(checklistRef, { items: updatedItems });
        }

      });
      showNotification({ type: 'success', title: 'Transaction Added', description: `Added ${formatCurrency(transaction.amount)} for ${transaction.source}.` });
      logger.info('Transaction added successfully', { amount: transaction.amount, type: transaction.type });
    } catch (error) {
      logger.error('Error adding transaction', error as Error);
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
            
            // Revert old transaction from plan
            if (oldTxData.tripId) {
                const oldPlanRef = doc(db, 'users', user.uid, 'tripPlans', oldTxData.tripId);
                const oldPlanSnap = await t.get(oldPlanRef);
                if (oldPlanSnap.exists()) {
                    const plan = oldPlanSnap.data() as TripPlan;
                    const newTotal = (plan.totalActualCost || 0) - oldTxData.amount;
                    const updatePayload: any = { totalActualCost: Math.max(0, newTotal) };
                    if (oldTxData.tripItemId) {
                        updatePayload.items = plan.items.map(i => i.id === oldTxData.tripItemId ? { ...i, actualCost: Math.max(0, (i.actualCost || 0) - oldTxData.amount) } : i);
                    }
                    t.update(oldPlanRef, updatePayload);
                }
            }
    
            // Apply new transaction to plan
            const { tripId: newPlanId, tripItemId: newItemId, amount: newAmount } = updatedData;
            if (newPlanId && newAmount) {
                const newPlanRef = doc(db, 'users', user.uid, 'tripPlans', newPlanId);
                const newPlanSnap = await t.get(newPlanRef);
                if (newPlanSnap.exists()) {
                    const plan = newPlanSnap.data() as TripPlan;
                    const newTotal = (plan.totalActualCost || 0) + newAmount;
                    const updatePayload: any = { totalActualCost: newTotal };
                    if (newItemId) {
                        updatePayload.items = plan.items.map(i => i.id === newItemId ? { ...i, actualCost: (i.actualCost || 0) + newAmount } : i);
                    }
                    t.update(newPlanRef, updatePayload);
                }
            }

            const carbonFootprint = estimateCarbonFootprint({ ...oldTxData, ...updatedData } as Omit<Transaction, 'id' | 'icon'>);
    
            const finalUpdateData: any = { ...updatedData, carbonFootprint };
            if (finalUpdateData.date) finalUpdateData.date = Timestamp.fromDate(new Date(finalUpdateData.date));
            t.update(txRef, finalUpdateData);
        });
        showNotification({ type: 'success', title: 'Transaction Updated', description: '' });
        logger.info('Transaction updated successfully', { transactionId });
    } catch (error) {
        logger.error('Error updating transaction', error as Error, { transactionId });
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
            
            if (txData.tripId) {
                const planRef = doc(db, 'users', user.uid, 'tripPlans', txData.tripId);
                const planSnap = await t.get(planRef);
                if (planSnap.exists()) {
                    const plan = planSnap.data() as TripPlan;
                    const newTotal = (plan.totalActualCost || 0) - txData.amount;
                    const updatePayload: any = { totalActualCost: Math.max(0, newTotal) };
                     if (txData.tripItemId) {
                        updatePayload.items = plan.items.map(i => i.id === txData.tripItemId ? { ...i, actualCost: Math.max(0, (i.actualCost || 0) - txData.amount) } : i);
                    }
                    t.update(planRef, updatePayload);
                }
            }
            t.delete(txRef);
        });
        showNotification({ type: 'success', title: 'Transaction Deleted', description: '' });
        logger.info('Transaction deleted successfully', { transactionId });
    } catch (error) {
        logger.error('Error deleting transaction', error as Error, { transactionId });
        showNotification({ type: 'error', title: 'Error', description: (error as Error).message });
    }
};

  const addBudget = async (budget: Omit<Budget, 'id' | 'createdAt' | 'userId' | 'month' | 'currentSpend'>) => {
    if (!user || !userProfile) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      const { cycleMonthStr } = getFinancialCycle(userProfile.financialCycleStartDay || 1);
      await addDoc(collection(db, 'users', user.uid, 'budgets'), {
        ...budget, month: cycleMonthStr, currentSpend: 0, userId: user.uid, createdAt: serverTimestamp(),
      });
      showNotification({ type: 'success', title: 'Budget Added', description: `New budget for ${budget.category} set to ${formatCurrency(budget.limit)}.` });
      logger.info('Budget added', { category: budget.category, limit: budget.limit });
    } catch (error) {
      logger.error('Error adding budget', error as Error);
      showNotification({ type: 'error', title: 'Error adding budget', description: '' });
    }
  };

  const updateBudget = async (budgetId: string, data: Partial<Omit<Budget, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      await updateDoc(doc(db, 'users', user.uid, 'budgets', budgetId), data);
      showNotification({ type: 'success', title: 'Budget Updated', description: '' });
      logger.info('Budget updated', { budgetId });
    } catch (error) {
      logger.error('Error updating budget', error as Error, { budgetId });
      showNotification({ type: 'error', title: 'Error updating budget', description: '' });
    }
  };

  const deleteBudget = async (budgetId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', budgetId));
      showNotification({ type: 'success', title: 'Budget Deleted', description: '' });
      logger.info('Budget deleted', { budgetId });
    } catch (error) {
      logger.error('Error deleting budget', error as Error, { budgetId });
      showNotification({ type: 'error', title: 'Error deleting budget', description: '' });
    }
  };
  
  const addTripPlan = async (plan: Omit<TripPlan, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'tripPlans'), {
            ...plan, userId: user.uid, createdAt: serverTimestamp(),
        });
        showNotification({ type: 'success', title: 'Trip Plan Created!', description: `Your new plan "${plan.title}" is ready.` });
        logger.info('Trip plan created', { title: plan.title });
    } catch (error) {
        logger.error('Error creating trip plan', error as Error);
        showNotification({ type: 'error', title: 'Error creating plan', description: '' });
    }
  }

  const updateTripPlan = async (planId: string, data: Partial<Omit<TripPlan, 'id'>>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid, 'tripPlans', planId), data);
        showNotification({ type: 'success', title: 'Trip Plan Updated', description: '' });
        logger.info('Trip plan updated', { planId });
    } catch (error) {
        logger.error('Error updating trip plan', error as Error, { planId });
        showNotification({ type: 'error', title: 'Error updating plan', description: '' });
    }
  };

  const deleteTripPlan = async (planId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'tripPlans', planId));
        showNotification({ type: 'success', title: 'Trip Plan Deleted', description: '' });
        logger.info('Trip plan deleted', { planId });
    } catch (error) {
        logger.error('Error deleting trip plan', error as Error, { planId });
        showNotification({ type: 'error', title: 'Error deleting plan', description: '' });
    }
  };

  const startTrip = async (tripId: string) => {
    if (!user) { return; }
    await updateDoc(doc(db, 'users', user.uid), { activeTripId: tripId });
    await updateDoc(doc(db, 'users', user.uid, 'tripPlans', tripId), { status: 'active' });
    showNotification({type: 'success', title: 'Trip Started!', description: 'All transactions will now be linked to this trip.'});
  };

  const endTrip = async (tripId: string) => {
    if (!user) { return; }
    await updateDoc(doc(db, 'users', user.uid), { activeTripId: null });
    await updateDoc(doc(db, 'users', user.uid, 'tripPlans', tripId), { status: 'completed' });
    showNotification({type: 'info', title: 'Trip Ended', description: 'You can view your trip report now.'});
  };

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await addDoc(collection(db, 'users', user.uid, 'recurringTransactions'), {
            ...transaction, userId: user.uid, isActive: true,
            startDate: Timestamp.fromDate(new Date(transaction.startDate)), createdAt: serverTimestamp(),
        });
        showNotification({ type: 'success', title: 'Recurring Transaction Added', description: `Scheduled "${transaction.title}".` });
        logger.info('Recurring transaction added', { title: transaction.title });
    } catch (error) {
        logger.error('Error adding recurring transaction', error as Error);
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
        logger.info('Recurring transaction updated', { transactionId });
    } catch (error) {
        logger.error('Error updating recurring transaction', error as Error, { transactionId });
        showNotification({ type: 'error', title: 'Error updating recurring item', description: '' });
    }
  };

  const deleteRecurringTransaction = async (transactionId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'recurringTransactions', transactionId));
        showNotification({ type: 'success', title: 'Recurring Transaction Deleted', description: '' });
        logger.info('Recurring transaction deleted', { transactionId });
    } catch (error) {
        logger.error('Error deleting recurring transaction', error as Error, { transactionId });
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
        logger.info('Savings goal added', { title: goal.title });
    } catch (error) {
        logger.error('Error adding savings goal', error as Error);
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
        logger.info('Savings goal updated', { goalId });
    } catch (error) {
        logger.error('Error updating savings goal', error as Error, { goalId });
        showNotification({ type: 'error', title: 'Error updating goal', description: '' });
    }
  };

  const deleteSavingsGoal = async (goalId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'savingsGoals', goalId));
        showNotification({ type: 'success', title: 'Savings Goal Deleted', description: '' });
        logger.info('Savings goal deleted', { goalId });
    } catch (error) {
        logger.error('Error deleting savings goal', error as Error, { goalId });
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
        logger.info('Investment added', { name: investment.name });
    } catch (error) {
        logger.error('Error adding investment', error as Error);
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
        logger.info('Investment updated', { investmentId });
    } catch (error) {
        logger.error('Error updating investment', error as Error, { investmentId });
        showNotification({ type: 'error', title: 'Error updating investment', description: '' });
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'investments', investmentId));
        showNotification({ type: 'success', title: 'Investment Deleted', description: '' });
        logger.info('Investment deleted', { investmentId });
    } catch (error) {
        logger.error('Error deleting investment', error as Error, { investmentId });
        showNotification({ type: 'error', title: 'Error deleting investment', description: '' });
    }
  };


  const calculateNewBadges = (goal: SavingsGoal, newCurrentAmount: number): BadgeType[] => {
    const newBadges: BadgeType[] = [];
    const now = new Date().toISOString();
    const existingBadgeNames = goal.badges.map(b => b.name);

    let milestones: { name: BadgeType['name'], percent: number }[] = [
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
      logger.info('User preferences updated', data);
    } catch (error) {
      logger.error('Error updating user preferences', error as Error);
      showNotification({ type: 'error', title: 'Error saving settings', description: '' });
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
      logger.info('User upgraded to premium', { plan });
    } catch (error) {
      logger.error('Error upgrading to premium', error as Error);
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
                planType: undefined,
            }
        }, { merge: true });

        showNotification({ type: 'info', title: 'Subscription Cancelled', description: 'Your Premium features will be disabled. We hope to see you back!' });
        logger.info('User downgraded from premium');
    } catch (error) {
        logger.error('Error downgrading from premium', error as Error);
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
        logger.info('Custom category added', { category });
    } catch (error) {
        logger.error('Error adding custom category', error as Error, { category });
        showNotification({ type: 'error', title: 'Error adding category', description: '' });
    }
  }

  const deleteCustomCategory = async (category: string) => {
    if (!user) { showNotification({ type: 'error', title: 'Not authenticated', description: '' }); return; }
    try {
        await updateDoc(doc(db, 'users', user.uid), { customCategories: arrayRemove(category) });
        showNotification({ type: 'success', title: `Category "${category}" removed.`, description: '' });
        logger.info('Custom category deleted', { category });
    } catch (error) {
        logger.error('Error deleting custom category', error as Error, { category });
        showNotification({ type: 'error', title: 'Error deleting category', description: '' });
    }
  }

  const analyzeTaxesWithLimit = async (input: Omit<AnalyzeTaxesInput, 'countryCode' | 'transactions' | 'investments' | 'savingsGoals'>): Promise<AnalyzeTaxesOutput | { error: string } | undefined> => {
    if (!user || !userProfile || !userProfile.countryCode) { 
      const errorMsg = 'Country code is not set in user profile.';
      showNotification({ type: 'error', title: 'Cannot Analyze Taxes', description: errorMsg }); 
      return { error: errorMsg };
    }

    if (!canRunTaxAnalysis) {
        showNotification({ type: 'error', title: 'Limit Reached', description: 'You have used your free tax analysis for this month.' });
        return { error: 'Limit Reached' };
    }

    const fullInput: AnalyzeTaxesInput = {
      ...input,
      countryCode: userProfile.countryCode,
      transactions: allTransactions.map(t => ({ id: t.id, type: t.type, amount: t.amount, category: t.category, source: t.source, date: t.date })),
      investments: investments.map(i => ({ name: i.name, assetType: i.assetType, marketValue: i.quantity * i.currentPrice })),
      savingsGoals: savingsGoals.map(s => ({ title: s.title, currentAmount: s.currentAmount })),
    };
    const result = await analyzeTaxesAction(fullInput);

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
    logger.info('Report generated');
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
    logger.info('Insights generated');
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
    logger.info('Receipt scanned');
    return result;
  };
  
  // Checklist-related functions
  const addChecklist = async (checklist: Omit<Checklist, 'id'|'userId'|'createdAt'|'icon'>) => {
    if (!user) return;
    try {
        await addDoc(collection(db, 'users', user.uid, 'checklists'), { 
            ...checklist, 
            userId: user.uid, 
            createdAt: serverTimestamp(),
            iconName: checklist.iconName
        });
        showNotification({ type: 'success', title: 'Checklist created!' });
    } catch(e) {
        logger.error('Error adding checklist', e as Error);
        showNotification({type: 'error', title: 'Error', description: 'Could not create checklist.'});
    }
  };

  const updateChecklist = async (checklistId: string, data: Partial<Omit<Checklist, 'id'|'icon'|'iconName'>>) => {
    if (!user) return;
    try {
        const { ...restData } = data;
        await updateDoc(doc(db, 'users', user.uid, 'checklists', checklistId), { ...restData });
        showNotification({ type: 'success', title: 'Checklist updated!' });
    } catch(e) {
        logger.error('Error updating checklist', e as Error, { checklistId });
        showNotification({type: 'error', title: 'Error', description: 'Could not update checklist.'});
    }
  };

  const deleteChecklist = async (checklistId: string) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'checklists', checklistId));
        showNotification({ type: 'success', title: 'Checklist deleted!' });
    } catch(e) {
        logger.error('Error deleting checklist', e as Error, { checklistId });
        showNotification({type: 'error', title: 'Error', description: 'Could not delete checklist.'});
    }
  };
  
  const createTemplateFromChecklist = async (checklist: Checklist) => {
    if (!user) return;
    try {
        const template: Omit<ChecklistTemplate, 'id'|'userId'|'createdAt' | 'icon'> = {
            title: `${checklist.title} Template`,
            items: checklist.items.map(item => ({ id: nanoid(), description: item.description, predictedCost: item.predictedCost, category: item.category })),
            iconName: checklist.iconName,
        }
        await addDoc(collection(db, 'users', user.uid, 'checklistTemplates'), { ...template, userId: user.uid, createdAt: serverTimestamp() });
        showNotification({ type: 'success', title: 'Template created!' });
    } catch (e) {
        logger.error('Error creating template', e as Error);
        showNotification({type: 'error', title: 'Error', description: 'Could not create template.'});
    }
  };
  
  const deleteChecklistTemplate = async (templateId: string) => {
    if (!user) return;
    try {
        await deleteDoc(doc(db, 'users', user.uid, 'checklistTemplates', templateId));
        showNotification({ type: 'success', title: 'Template deleted!' });
    } catch (e) {
        logger.error('Error deleting template', e as Error, { templateId });
        showNotification({type: 'error', title: 'Error', description: 'Could not delete template.'});
    }
  }


  const logout = async () => {
    if (user) {
        logger.info('User logging out');
        await auth.signOut();
    }
  };

  return (
    <AppContext.Provider
      value={{
        user, userProfile, isPremium, loading, transactions: transactionsForCurrentCycle, deductibleTransactionsCount, addTransaction, updateTransaction,
        deleteTransaction, logout, categories: categoryIcons, expenseCategories, incomeCategories, allCategories,
        addCustomCategory, deleteCustomCategory, budgets, addBudget, updateBudget, deleteBudget,
        tripPlans, addTripPlan, updateTripPlan, deleteTripPlan, startTrip, endTrip,
        updateUserPreferences, recurringTransactions, addRecurringTransaction,
        updateRecurringTransaction, deleteRecurringTransaction, savingsGoals,
        addSavingsGoal, updateSavingsGoal, deleteSavingsGoal, 
        investments, addInvestment, updateInvestment, deleteInvestment,
        formatCurrency,
        notifications, showNotification, markAllNotificationsAsRead,
        upgradeToPremium, downgradeFromPremium,
        canRunTaxAnalysis, analyzeTaxesWithLimit,
        canGenerateReport, generateReportWithLimit,
        canGenerateInsights, generateInsightsWithLimit,
        canScanReceipt, scanReceiptWithLimit,
        checklists, addChecklist, updateChecklist, deleteChecklist,
        checklistTemplates, createTemplateFromChecklist, deleteChecklistTemplate,
        transactionsForCurrentCycle,
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
