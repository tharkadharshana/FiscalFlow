
'use client';

import { useMemo, useState } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Calculator, FileText, Car, Percent, Landmark, Wallet, Loader2, ChevronDown, BookOpen, Sparkles } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

// Import Calculators
import { VehicleImportCalculator } from '@/components/dashboard/tax/vehicle-import-calculator';
import { IncomeTaxCalculator } from '@/components/dashboard/tax/income-tax-calculator';
import { VatCalculator } from '@/components/dashboard/tax/vat-calculator';
import { StampDutyCalculator } from '@/components/dashboard/tax/stamp-duty-calculator';
import type { AnalyzeTaxesInput, AnalyzeTaxesOutput } from '@/ai/flows/analyze-taxes-flow';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { UpgradeCard } from '@/components/ui/upgrade-card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function TaxPage() {
    const { transactions, formatCurrency, isPremium, canRunTaxAnalysis, analyzeTaxesWithLimit } = useAppContext();
    const [analysisResult, setAnalysisResult] = useState<AnalyzeTaxesOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [taxDocument, setTaxDocument] = useState<string>('');
    const [isDocsOpen, setIsDocsOpen] = useState(false);

    const taxData = useMemo(() => {
        const taxRelatedTransactions = transactions.filter(t => t.isTaxDeductible).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const taxableIncome = taxRelatedTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const deductibleExpenses = taxRelatedTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        // Placeholder for tax calculation logic
        const estimatedTaxLiability = (taxableIncome - deductibleExpenses) * 0.15; // Simplified 15% rate

        return { taxableIncome, deductibleExpenses, taxRelatedTransactions, estimatedTaxLiability: Math.max(0, estimatedTaxLiability) };
    }, [transactions]);
    
    const handleAnalyzeTaxes = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        const analysisInput: AnalyzeTaxesInput = {
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: t.amount,
                category: t.category,
                source: t.source,
                date: t.date,
            })),
            taxDocument: taxDocument,
        };

        const result = await analyzeTaxesWithLimit(analysisInput);
        
        if (result && 'error' in result) {
            setAnalysisError(result.error);
        } else if (result) {
            setAnalysisResult(result);
        }
        setIsAnalyzing(false);
    }

  const RunAnalysisButton = (
    <Button onClick={handleAnalyzeTaxes} disabled={isAnalyzing || !canRunTaxAnalysis}>
        {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
    </Button>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Tax Center" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="overview">
            <div className='flex justify-between items-center mb-4'>
                <TabsList className="grid grid-cols-2 h-auto">
                    <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4"/>Overview & Reports</TabsTrigger>
                    <TabsTrigger value="calculators"><Calculator className="mr-2 h-4 w-4"/>Calculators</TabsTrigger>
                </TabsList>
                <Button variant="outline" disabled={!isPremium}><FileDown className="mr-2 h-4 w-4"/>Export Tax Report</Button>
            </div>
            
            <TabsContent value="overview">
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Taxable Income</CardTitle>
                            <CardDescription>Total income marked as taxable.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{formatCurrency(taxData.taxableIncome)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Deductible Expenses</CardTitle>
                            <CardDescription>Total expenses marked as deductible.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{formatCurrency(taxData.deductibleExpenses)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Flagged Transactions</CardTitle>
                            <CardDescription>Count of manually flagged items.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{taxData.taxRelatedTransactions.length}</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            AI Tax Analysis Engine
                            {!isPremium && <Sparkles className="h-5 w-5 text-amber-500" />}
                        </CardTitle>
                        <CardDescription>
                            Automatically detect potential direct and indirect taxes based on your transaction history.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAnalyzing ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-4 text-muted-foreground">AI is analyzing your transactions...</p>
                            </div>
                        ) : analysisResult ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tax Type</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Estimated Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.liabilities?.length > 0 ? (
                                        analysisResult.liabilities.map((liability: any, index: number) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{liability.taxType}</TableCell>
                                                <TableCell>{liability.description}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(liability.amount)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">No tax liabilities detected.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        ) : analysisError ? (
                            <Alert variant="destructive">
                                <AlertTitle>Analysis Failed</AlertTitle>
                                <AlertDescription>{analysisError}</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>Click the button below to start the analysis.</p>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-start gap-4">
                        <Collapsible open={isDocsOpen} onOpenChange={setIsDocsOpen} className="w-full">
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="w-full justify-start px-2 gap-2">
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isDocsOpen && 'rotate-180'}`} />
                                    <BookOpen className="h-4 w-4" />
                                    <span>Provide Custom Tax Documentation (Optional)</span>
                                </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-2 pt-4">
                                <Label htmlFor="tax-docs">Custom Tax Rules</Label>
                                <Textarea 
                                    id="tax-docs"
                                    placeholder="Paste any custom tax rules or documentation here. For example: 'VAT is 20% on all items except for food.' The AI will use this as its primary source of truth."
                                    value={taxDocument}
                                    onChange={(e) => setTaxDocument(e.target.value)}
                                    rows={6}
                                />
                                <p className="text-xs text-muted-foreground">The AI will prioritize these rules over its built-in knowledge.</p>
                            </CollapsibleContent>
                        </Collapsible>
                        {canRunTaxAnalysis ? RunAnalysisButton : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>{RunAnalysisButton}</TooltipTrigger>
                                    <TooltipContent>
                                        <p>You have used your free tax analysis for this month. Upgrade for more.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </CardFooter>
                </Card>
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Manually Flagged Transactions</CardTitle>
                        <CardDescription>
                            This table shows all income and expenses you've manually flagged as tax-related. Free users can flag up to {FREE_TIER_LIMITS.taxDeductibleFlags} items.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Source/Vendor</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {taxData.taxRelatedTransactions.length > 0 ? (
                                    taxData.taxRelatedTransactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{format(parseISO(t.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium">{t.source}</TableCell>
                                            <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={t.type === 'income' ? 'secondary' : 'default'} className={t.type === 'income' ? 'bg-green-100 text-green-700' : ''}>{t.type}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{formatCurrency(t.amount)}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">No tax-related transactions recorded.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
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
                               <TabsTrigger value="vehicle" disabled={!isPremium}><Car className="mr-2 h-4 w-4" />Vehicle Import</TabsTrigger>
                               <TabsTrigger value="vat" disabled={!isPremium}><Percent className="mr-2 h-4 w-4" />VAT</TabsTrigger>
                               <TabsTrigger value="stamp" disabled={!isPremium}><Landmark className="mr-2 h-4 w-4" />Stamp Duty</TabsTrigger>
                           </TabsList>
                           <TabsContent value="income" className="pt-6">
                                <IncomeTaxCalculator />
                           </TabsContent>
                           <TabsContent value="vehicle" className="pt-6">
                                {isPremium ? <VehicleImportCalculator /> : <UpgradeCard title="Unlock Advanced Calculators" description="Upgrade to premium for access to all tax estimation tools."/>}
                           </TabsContent>
                           <TabsContent value="vat" className="pt-6">
                                {isPremium ? <VatCalculator /> : <UpgradeCard title="Unlock Advanced Calculators" description="Upgrade to premium for access to all tax estimation tools."/>}
                           </TabsContent>
                           <TabsContent value="stamp" className="pt-6">
                                {isPremium ? <StampDutyCalculator /> : <UpgradeCard title="Unlock Advanced Calculators" description="Upgrade to premium for access to all tax estimation tools."/>}
                           </TabsContent>
                       </Tabs>
                    </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
