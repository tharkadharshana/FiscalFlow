import type { Transaction } from '@/types';
import { ShoppingCart, Utensils, Fuel, Home, Shirt, Gift, Film, Bus, HeartPulse } from 'lucide-react';

export const categories = {
  "Groceries": ShoppingCart,
  "Food": Utensils,
  "Transport": Fuel,
  "Rent": Home,
  "Clothing": Shirt,
  "Gifts": Gift,
  "Entertainment": Film,
  "Utilities": HeartPulse,
  "Public Transport": Bus,
  "Salary": Home,
  "Freelance": Home
};

export const transactions: Transaction[] = [
  { id: '1', type: 'expense', amount: 24.50, category: 'Food', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), description: 'Lunch at The Deli', icon: Utensils },
  { id: '2', type: 'expense', amount: 89.99, category: 'Groceries', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'Weekly grocery shopping', icon: ShoppingCart },
  { id: '3', type: 'income', amount: 2500, category: 'Salary', date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), description: 'Monthly Salary', icon: Home },
  { id: '4', type: 'expense', amount: 45.00, category: 'Transport', date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), description: 'Gasoline for car', icon: Fuel },
  { id: '5', type: 'expense', amount: 120.00, category: 'Clothing', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'New Jeans', icon: Shirt },
];

export const defaultCategories = [
    "Groceries",
    "Food",
    "Transport",
    "Rent",
    "Clothing",
    "Gifts",
    "Entertainment",
    "Utilities",
    "Public Transport",
    "Salary",
    "Freelance"
];