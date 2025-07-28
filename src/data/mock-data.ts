import type { Transaction } from '@/types';
import { ShoppingCart, Utensils, Fuel, Home, Shirt, Gift, Film, Bus, HeartPulse, Briefcase, TrendingUp, Award, GitFork, DollarSign, Hammer, GraduationCap, Dumbbell } from 'lucide-react';

export const categories: Record<string, React.ComponentType<{ className?: string }>> = {
  // Expenses
  "Groceries": ShoppingCart,
  "Food": Utensils,
  "Transport": Fuel,
  "Rent": Home,
  "Clothing": Shirt,
  "Gifts": Gift,
  "Entertainment": Film,
  "Utilities": HeartPulse,
  "Public Transport": Bus,
  "Home Repair": Hammer,
  "Education": GraduationCap,
  "Health & Fitness": Dumbbell,
  // Income
  "Salary": DollarSign,
  "Freelance": DollarSign,
  "Business Sale": Briefcase,
  "Investments": TrendingUp,
  "Bonus": Award,
  "Side Hustle": GitFork,
  "Gift Income": Gift,
  // Fallback
  "ShoppingCart": ShoppingCart, // From checklist default
};

export const defaultExpenseCategories = [
    "Groceries",
    "Food",
    "Transport",
    "Rent",
    "Clothing",
    "Gifts",
    "Entertainment",
    "Utilities",
    "Public Transport",
    "Home Repair",
    "Education",
    "Health & Fitness",
];

export const defaultIncomeCategories = [
    "Salary",
    "Freelance",
    "Business Sale",
    "Investments",
    "Bonus",
    "Side Hustle",
    "Gift Income",
];

export const defaultCategories = [
    ...defaultExpenseCategories,
    ...defaultIncomeCategories
];


export const transactions: Transaction[] = [
  { id: '1', type: 'expense', amount: 24.50, category: 'Food', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), source: 'The Deli', notes: 'Lunch meeting', icon: Utensils },
  { id: '2', type: 'expense', amount: 89.99, category: 'Groceries', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), source: 'SuperMart', notes: 'Weekly grocery shopping', icon: ShoppingCart },
  { id: '3', type: 'income', amount: 2500, category: 'Salary', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), source: 'Acme Corp', notes: 'Monthly Salary', icon: Home },
  { id: '4', type: 'expense', amount: 45.00, category: 'Transport', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), source: 'Gas Station', notes: 'Filled up the car', icon: Fuel },
  { id: '5', type: 'expense', amount: 120.00, category: 'Clothing', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), source: 'Style Hub', notes: 'New Jeans', icon: Shirt },
];
