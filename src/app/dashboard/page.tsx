

'use client';

import { Header } from '@/components/dashboard/header';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { SpendChart } from '@/components/dashboard/spend-chart';
import { SmartInsights } from '@/components/dashboard/smart-insights';
import { TopCategories } from '@/components/dashboard/top-categories';
import { CarbonFootprintCard } from '@/components/dashboard/carbon-footprint-card';
import { PortfolioOverview } from '@/components/dashboard/portfolio-overview';
import { useAppContext } from '@/contexts/app-context';
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';
import { OnboardingDialog } from '@/components/dashboard/onboarding-dialog';

export default function DashboardPage() {
  const { isPremium, userProfile } = useAppContext();
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    if (userProfile && userProfile.hasCompletedOnboarding === false) {
      setIsOnboardingOpen(true);
    }
  }, [userProfile]);

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Dashboard" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <SummaryCards />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <SpendChart />
            </div>
            <div className="lg:col-span-3">
              <TopCategories />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <div className="lg:col-span-4">
              <RecentTransactions />
            </div>
            <div className="lg:col-span-3 space-y-6">
                <PortfolioOverview />
                <CarbonFootprintCard />
                {isPremium ? (
                  <SmartInsights />
                ) : (
                  <UpgradeCard
                    title="Unlock AI-Powered Smart Insights"
                    description="Get personalized tips and analysis to improve your financial health with Premium."
                    icon={Lightbulb}
                  />
                )}
            </div>
          </div>
        </main>
      </div>
      <OnboardingDialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen} />
    </>
  );
}
