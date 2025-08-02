

'use client';

import { useMemo, useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, FileText, Car, Percent, Landmark, Wallet, Loader2, Sparkles, AlertCircle } from 'lucide-react';

// Import Calculators
import { VehicleImportCalculator } from '@/components/dashboard/tax/vehicle-import-calculator';
import { IncomeTaxCalculator } from '@/components/dashboard/tax/income-tax-calculator';
import { VatCalculator } from '@/components/dashboard/tax/vat-calculator';
import { StampDutyCalculator } from '@/components/dashboard/tax/stamp-duty-calculator';
import type { AnalyzeTaxesOutput, Transaction } from '@/types/schemas';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TaxAnalysisFilters } from '@/components/dashboard/tax/tax-analysis-filters';
import { TaxAnalysisResults } from '@/components/dashboard/tax/tax-analysis-results';

export default function TaxPage() {
    const { analyzeTaxesWithLimit, showNotification } = useAppContext();
    const [analysisResult, setAnalysisResult] = useState<AnalyzeTaxesOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const handleAnalyzeTaxes = async (filteredTransactions: Transaction[]) => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        if (filteredTransactions.length === 0) {
            showNotification({ type: 'warning', title: 'No Transactions Found', description: 'There are no transactions matching your filter criteria.' });
            setIsAnalyzing(false);
            return;
        }

        const unanalyzedTransactions = filteredTransactions.filter(t => !t.isTaxAnalyzed);

        if (unanalyzedTransactions.length === 0) {
            showNotification({ type: 'info', title: 'Already Analyzed', description: 'All transactions in this period have been analyzed for taxes.' });
            const alreadyAnalyzedReport = { analyzedTransactions: filteredTransactions };
            setAnalysisResult(alreadyAnalyzedReport);
            setIsAnalyzing(false);
            return;
        }
        
        const result = await analyzeTaxesWithLimit({ transactions: unanalyzedTransactions });
        
        if (result && 'error' in result) {
            setAnalysisError(result.error);
        } else if (result) {
            // Combine newly analyzed transactions with previously analyzed ones from the original `transactions` list
            const analyzedIds = new Set(result.analyzedTransactions.map(t => t.id));
            const existingAnalyzed = filteredTransactions.filter(t => t.isTaxAnalyzed && !analyzedIds.has(t.id));
            const finalResults = [...existingAnalyzed, ...result.analyzedTransactions];
            setAnalysisResult({ analyzedTransactions: finalResults });
        }
        setIsAnalyzing(false);
    }

  return (
    <div className="flex flex-1 flex-col">
    <Header title="Tax Center" />
    <main className="flex-1 space-y-6 p-4 md:p-6">
        <Tabs defaultValue="overview">
        <div className='flex justify-between items-center mb-4'>
            <TabsList className="grid grid-cols-2 h-auto">
                <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4"/>Overview & Reports</TabsTrigger>
                <TabsTrigger value="calculators"><Calculator className="mr-2 h-4 w-4"/>Calculators</TabsTrigger>
            </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
            <TaxAnalysisFilters 
                onAnalyze={handleAnalyzeTaxes} 
                isAnalyzing={isAnalyzing}
            />

            {isAnalyzing ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-4 text-muted-foreground">AI is analyzing your transactions...</p>
                </div>
            ) : analysisResult ? (
                <TaxAnalysisResults report={analysisResult} />
            ) : analysisError ? (
                <Alert variant="destructive">
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>{analysisError}</AlertDescription>
                </Alert>
            ) : (
                <div className="text-center text-muted-foreground py-16 rounded-lg border-2 border-dashed">
                    <p className="text-lg font-semibold">Ready for Tax Analysis</p>
                    <p>Select your filters and click "Run AI Analysis" to begin.</p>
                </div>
            )}
        </TabsContent>

        <TabsContent value="calculators">
            <Card>
                <CardHeader>
                    <CardTitle>Sri Lankan Tax Calculators</CardTitle>
                    <CardDescription>
                        Estimate various local taxes. For free users, only the Income Tax calculator is available.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="income" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                            <TabsTrigger value="income"><Wallet className="mr-2 h-4 w-4" />Income Tax</TabsTrigger>
                            <TabsTrigger value="vehicle"><Car className="mr-2 h-4 w-4" />Vehicle Import</TabsTrigger>
                            <TabsTrigger value="vat"><Percent className="mr-2 h-4 w-4" />VAT</TabsTrigger>
                            <TabsTrigger value="stamp"><Landmark className="mr-2 h-4 w-4" />Stamp Duty</TabsTrigger>
                        </TabsList>
                        <TabsContent value="income" className="pt-6">
                            <IncomeTaxCalculator />
                        </TabsContent>
                        <TabsContent value="vehicle" className="pt-6">
                            <VehicleImportCalculator />
                        </TabsContent>
                        <TabsContent value="vat" className="pt-6">
                            <VatCalculator />
                        </TabsContent>
                        <TabsContent value="stamp" className="pt-6">
                            <StampDutyCalculator />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </TabsContent>
        </Tabs>
    </main>
    </div>
  );
}
