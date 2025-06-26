'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { categories as mockCategories } from '@/data/mock-data';
import type { Transaction } from '@/types';
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
} from 'firebase/firestore';

interface AppContextType {
  user: User | null;
  loading: boolean;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'icon'>) => void;
  logout: () => Promise<void>;
  categories: Record<string, React.ComponentType<{ className?: string }>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('date', 'desc')
      );
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const userTransactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
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

      return () => unsubscribe();
    } else {
      setTransactions([]);
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

    const { date, ...restOfTransaction } = transaction;

    const transactionData = {
      ...restOfTransaction,
      date: Timestamp.fromDate(new Date(date)),
      createdAt: serverTimestamp(),
      userId: user.uid,
    };

    try {
      await addDoc(
        collection(db, 'users', user.uid, 'transactions'),
        transactionData
      );

      toast({
        title: `${transaction.type === 'income' ? 'Income' : 'Expense'} Added`,
        description: `${transaction.source} - $${transaction.amount.toFixed(2)}`,
      });
    } catch (error) {
      console.error('Error adding transaction: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not add transaction.',
      });
    }
  };

  const logout = async () => {
    await auth.signOut();
  };

  return (
    <AppContext.Provider value={{ user, loading, transactions, addTransaction, logout, categories: mockCategories }}>
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
