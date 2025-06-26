export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string; // ISO string
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}
