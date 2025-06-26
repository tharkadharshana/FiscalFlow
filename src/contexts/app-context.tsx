'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { transactions as mockTransactions, categories as mockCategories } from '@/data/mock-data';
import type { Transaction } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';

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
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addTransaction = (transaction: Omit<Transaction, 'id' | 'icon'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx_${Date.now()}_${Math.random()}`,
      icon: mockCategories[transaction.category] || mockCategories['Food'],
    };
    
    setTransactions(prev => [newTransaction, ...prev]);

    toast({
        title: `${transaction.type === 'income' ? 'Income' : 'Expense'} Added`,
        description: `${transaction.description} - $${transaction.amount.toFixed(2)}`,
      });
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
