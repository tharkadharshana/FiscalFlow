
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import type { Transaction } from '@/types';
import { Button } from '../ui/button';
import { UpgradeCard } from '../ui/upgrade-card';

export function SmartInsights() {
  const { transactionsForCurrentCycle: transactions, canGenerateInsights, generateInsightsWithLimit } = useAppContext();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchInsights = async () => {
    if (transactions.length > 0) {
      setIsLoading(true);
      setError(null);
      
      const relevantTransactions = transactions.slice(0, 20).map((t: Transaction) => ({
          amount: t.amount,
          category: t.category,
          source: t.source,
          date: t.date,
          type: t.type
      }));

      const result = await generateInsightsWithLimit({ transactions: relevantTransactions });

      if (result && 'error' in result) {
        setError(result.error);
        if(result.error !== 'Limit Reached') {
          setInsights([]);
        }
      } else if (result && result.insights) {
        setInsights(result.insights);
      }
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setInsights([]);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Lightbulb className="h-5 w-5 flex-shrink-0 text-yellow-400" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-full rounded-md bg-muted animate-pulse"></div>
                <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!canGenerateInsights) {
        return (
            <UpgradeCard
                title="Get More Smart Insights"
                description="You've used your free AI insights for this month. Upgrade to Premium for unlimited analysis."
                icon={Lightbulb}
            />
        )
    }

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>;
    }

    if (insights.length === 0 && !isLoading) {
        return (
            <div className="text-center space-y-4 py-4">
                <p className="text-sm text-muted-foreground">Get personalized tips and analysis to improve your financial health.</p>
                <Button onClick={handleFetchInsights} disabled={transactions.length < 3}>
                    <Sparkles className="mr-2 h-4 w-4"/>
                    Generate Insights
                </Button>
                {transactions.length < 3 && <p className="text-xs text-muted-foreground">Log at least 3 transactions to enable.</p>}
            </div>
        )
    }

    return (
        <ul className="space-y-4">
          {insights.map((insight, index) => (
            <li key={index} className="flex items-start gap-4">
              <Lightbulb className="mt-1 h-5 w-5 flex-shrink-0 text-yellow-400" />
              <p className="text-sm text-muted-foreground">{insight}</p>
            </li>
          ))}
        </ul>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Smart Insights</CardTitle>
        <CardDescription>AI-powered tips based on your spending.</CardDescription>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
}
