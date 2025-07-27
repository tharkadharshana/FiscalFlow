

'use client';

import { Header } from '@/components/dashboard/header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendChart } from '@/components/dashboard/spend-chart';
import { SmartInsights } from '@/components/dashboard/smart-insights';
import { TopCategories } from '@/components/dashboard/top-categories';
import { PortfolioOverview } from '@/components/dashboard/portfolio-overview';
import { useAppContext } from '@/contexts/app-context';
import { useState, useEffect } from 'react';
import { OnboardingDialog } from '@/components/dashboard/onboarding-dialog';
import { CarbonFootprintCard } from '@/components/dashboard/carbon-footprint-card';
import { ChecklistSummary } from '@/components/dashboard/checklist-summary';

export default function DashboardPage() {
  const { userProfile, updateUserPreferences } = useAppContext();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    // Show onboarding if the user has opted in (or hasn't opted out yet)
    if (userProfile && userProfile.showOnboardingOnLogin) {
      setIsOnboardingOpen(true);
      // Immediately update the profile so it doesn't show again on navigation
      updateUserPreferences({ showOnboardingOnLogin: false });
    }
  }, [userProfile, updateUserPreferences]);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <SummaryCards />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
             <SpendChart />
             <TopCategories />
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
             <RecentTransactions />
             <div className="space-y-6">
                <PortfolioOverview />
                <ChecklistSummary />
                <CarbonFootprintCard />
                <SmartInsights />
             </div>
          </div>
        </main>
      </div>
      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </>
  );
}
