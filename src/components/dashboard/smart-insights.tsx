'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Lightbulb, Loader2 } from 'lucide-react';
import { generateInsightsAction } from '@/lib/actions';
import type { Transaction } from '@/types';

export function SmartInsights() {
  const { transactions } = useAppContext();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
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

        const result = await generateInsightsAction({ transactions: relevantTransactions });

        if ('error' in result) {
          setError(result.error);
        } else if (result.insights) {
          setInsights(result.insights);
        }
        setIsLoading(false);
      } else {
        setIsLoading(false);
        setInsights([]);
      }
    };

    // Debounce the call to avoid excessive API calls on rapid transaction changes
    const handler = setTimeout(() => {
        fetchInsights();
    }, 500);

    return () => {
        clearTimeout(handler);
    }
  }, [transactions]);

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

    if (error) {
        return <p className="text-sm text-destructive">{error}</p>;
    }

    if (insights.length === 0 && !isLoading) {
        return <p className="text-center text-sm text-muted-foreground py-8">Log some transactions to see your AI-powered insights!</p>;
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
    <Card className="h-full">
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
