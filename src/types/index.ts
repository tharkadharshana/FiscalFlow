






export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // ISO string
  source: string;
  notes?: string;
  icon: React.ComponentType<{ className?: string }>;
  imageURL?: string;
  tags?: string[];
  ocrParsed?: boolean;
  isRecurring?: boolean;
  paymentMethod?: string;
  invoiceNumber?: string;
  financialPlanId?: string; // ID of the FinancialPlan
  planItemId?: string; // ID of the item within the plan
  isTaxDeductible?: boolean;
  carbonFootprint?: number; // in kg CO2e
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string; // Format: YYYY-MM
  currentSpend: number;
  userId?: string;
  createdAt?: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  currencyPreference: string;
  darkModeBanner: boolean;
  notificationPreferences: {
    budgetThreshold: boolean;
    recurringPayment: boolean;
  };
  profilePictureURL: string | null;
  createdAt: any;
  lastLoginAt: any;
  customCategories?: string[];
  subscription: {
    tier: 'free' | 'premium';
    isActive: boolean;
    expiryDate: string | null;
    monthlyOcrScans?: { count: number; month: string }; // YYYY-MM
    monthlyRoundups?: { count: number; month: string };
    monthlyTaxReports?: { count: number; month: string };
    monthlyVoiceCommands?: { count: number; month: string };
  };
  hasCompletedOnboarding?: boolean;
}

export interface PlanItem {
  id: string;
  description: string;
  category: string;
  predictedCost: number;
  actualCost: number | null;
  notes?: string;
  isAiSuggested?: boolean;
}

export interface FinancialPlan {
  id: string;
  userId: string;
  title: string;
  description?: string; // User's initial voice input
  status: 'planning' | 'active' | 'completed';
  createdAt: any;
  items: PlanItem[];
  totalPredictedCost: number;
  totalActualCost: number;
}

export interface RecurringTransaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  category: string;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string; // ISO string for the start date
  notes?: string;
  source: string; // For expense, vendor. For income, payer.
  isActive: boolean;
  lastGeneratedDate?: string; // ISO string
  createdAt: any;
}

export interface Badge {
  name: 'First Saving' | '25% Mark' | '50% Mark' | '75% Mark' | 'Goal Achieved!';
  dateAchieved: string; // ISO string
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // ISO string
  createdAt: any;
  isRoundupGoal?: boolean;
  badges: Badge[];
}

export interface Investment {
    id: string;
    userId: string;
    name: string; // e.g. Apple Inc.
    symbol: string; // e.g. AAPL
    assetType: 'Stock' | 'ETF' | 'Crypto' | 'Mutual Fund' | 'Other';
    quantity: number;
    purchasePrice: number;
    currentPrice: number;
    purchaseDate: string; // ISO string
    createdAt: any;
  }

export interface TaxLiability {
  taxType: string;
  description: string;
  amount: number;
  sourceTransactionIds?: string[];
}

export interface Notification {
  id:string;
  title: string;
  description: string;
  createdAt: any; // ISO String or Firestore Timestamp
  isRead: boolean;
  type: 'success' | 'info' | 'warning' | 'error';
}
