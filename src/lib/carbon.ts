import type { Transaction } from '@/types';

// kg CO2e per primary currency unit (e.g., USD)
// These are illustrative values for demonstration and not scientifically accurate.
const CARBON_FACTORS: Record<string, number> = {
  // Expenses
  "Transport": 0.4, // High impact (gas, ride-sharing)
  "Utilities": 0.3, // Electricity, gas usage
  "Food": 0.25,     // Dining out, meat products have higher footprint
  "Groceries": 0.15,  // Varies greatly, average value
  "Clothing": 0.35,   // Fast fashion has a high footprint
  "Entertainment": 0.1,
  "Rent": 0, // No direct emission
  "Gifts": 0.2,
  "Public Transport": 0.05, // Lower impact

  // Income categories have no direct footprint from the transaction itself
  "Salary": 0,
  "Freelance": 0,
  "Business Sale": 0,
  "Investments": 0,
  "Bonus": 0,
  "Side Hustle": 0,
  "Gift Income": 0,
};

export function estimateCarbonFootprint(transaction: Omit<Transaction, 'id' | 'icon'>): number {
  if (transaction.type === 'income') {
    return 0;
  }

  const factor = CARBON_FACTORS[transaction.category] ?? 0.1; // Default factor for unknown categories
  return transaction.amount * factor;
}
