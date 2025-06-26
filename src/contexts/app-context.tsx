'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { transactions as mockTransactions, categories as mockCategories } from '@/data/mock-data';
import type { Transaction } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface AppContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'icon'>) => void;
  categories: Record<string, React.ComponentType<{ className?: string }>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const { toast } = useToast();

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

  return (
    <AppContext.Provider value={{ transactions, addTransaction, categories: mockCategories }}>
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
