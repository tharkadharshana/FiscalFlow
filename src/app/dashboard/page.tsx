import { Header } from '@/components/dashboard/header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { ExpenseChart } from '@/components/dashboard/expense-chart';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendChart } from '@/components/dashboard/spend-chart';
import { SmartInsights } from '@/components/dashboard/smart-insights';

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Dashboard" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <SummaryCards />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <SpendChart />
          </div>
          <div className="lg:col-span-3">
            <ExpenseChart />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <RecentTransactions />
          </div>
          <div className="lg:col-span-3">
            <SmartInsights />
          </div>
        </div>
      </main>
    </div>
  );
}
