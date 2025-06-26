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
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
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
}
