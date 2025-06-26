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
