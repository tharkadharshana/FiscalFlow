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
