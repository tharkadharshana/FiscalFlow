

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
import { FileDown, Calculator, FileText, Car, Percent, Landmark, Wallet, Loader2, ChevronDown, BookOpen, Sparkles, AlertCircle, ShoppingBasket, Info } from 'lucide-react';
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
import { CostBreakdownCalculator } from '@/components/dashboard/tax/cost-breakdown-calculator';
import type { AnalyzeTaxesOutput, Transaction as AnalyzedTransaction } from '@/types/schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export default function TaxPage() {
    const { userProfile, transactions, formatCurrency, isPremium, canRunTaxAnalysis, analyzeTaxesWithLimit } = useAppContext();
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

        return { taxableIncome, deductibleExpenses, taxRelatedTransactions };
    }, [transactions]);
    
    const handleAnalyzeTaxes = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        const result = await analyzeTaxesWithLimit({
            transactions: transactions.filter(t => !t.isTaxAnalyzed).map(t => ({ // Only send un-analyzed transactions
                id: t.id,
                type: t.type,
                amount: t.amount,
                category: t.category,
                source: t.source,
                date: t.date,
                items: t.items || [{id: t.id, description: t.notes || t.source, amount: t.amount }],
                notes: t.notes,
            })),
            taxDocument: taxDocument,
        });
        
        if (result && 'error' in result) {
            setAnalysisError(result.error);
        } else if (result) {
            setAnalysisResult(result);
            // Here you would typically update the transactions in your main state
            // For now, we just display the result.
        }
        setIsAnalyzing(false);
    }

  const RunAnalysisButton = (
    <Button onClick={handleAnalyzeTaxes} disabled={isAnalyzing || !canRunTaxAnalysis}>
        {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : 'Run AI Analysis'}
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
                    <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4"/>Overview & AI Analysis</TabsTrigger>
                    <TabsTrigger value="calculators"><Calculator className="mr-2 h-4 w-4"/>Calculators</TabsTrigger>
                </TabsList>
                <Button variant="outline" disabled={!isPremium}><FileDown className="mr-2 h-4 w-4"/>Export Tax Report</Button>
            </div>
            
            <TabsContent value="overview">
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                    {/* Summary Cards */}
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            AI Tax Analysis Engine
                            {!isPremium && <Sparkles className="h-5 w-5 text-amber-500" />}
                        </CardTitle>
                        <CardDescription>
                            Automatically detect and break down indirect taxes on your expense transactions based on your country's regulations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAnalyzing ? (
                            <div className="flex justify-center items-center h-24">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="ml-4 text-muted-foreground">AI is analyzing your transactions...</p>
                            </div>
                        ) : analysisResult ? (
                            <AnalyzedTransactionsTable result={analysisResult} />
                        ) : analysisError ? (
                            <Alert variant="destructive">
                                <AlertTitle>Analysis Failed</AlertTitle>
                                <AlertDescription>{analysisError}</AlertDescription>
                            </Alert>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                <p>Click the button below to start the item-wise tax analysis.</p>
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
                        {userProfile?.countryCode !== 'LK' && (
                            <Alert variant="destructive" className="mb-6">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Country Mismatch Warning</AlertTitle>
                                <AlertDescription>
                                    These calculators are based on Sri Lankan (LK) tax laws. Your profile is set to {userProfile?.countryCode}, so these results may be inaccurate for you. Use the AI Tax Analysis for personalized calculations.
                                </AlertDescription>
                            </Alert>
                        )}
                       <Tabs defaultValue="income" className="w-full">
                           <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 h-auto">
                               <TabsTrigger value="income"><Wallet className="mr-2 h-4 w-4" />Income Tax</TabsTrigger>
                               <TabsTrigger value="vehicle"><Car className="mr-2 h-4 w-4" />Vehicle Import</TabsTrigger>
                               <TabsTrigger value="vat"><Percent className="mr-2 h-4 w-4" />VAT</TabsTrigger>
                               <TabsTrigger value="stamp"><Landmark className="mr-2 h-4 w-4" />Stamp Duty</TabsTrigger>
                               <TabsTrigger value="breakdown"><ShoppingBasket className="mr-2 h-4 w-4" />Cost Breakdown</TabsTrigger>
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
                           <TabsContent value="breakdown" className="pt-6">
                                <CostBreakdownCalculator />
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

function AnalyzedTransactionsTable({ result }: { result: AnalyzeTaxesOutput }) {
    const { formatCurrency } = useAppContext();

    if (!result.analyzedTransactions || result.analyzedTransactions.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-10">
                <Info className="mx-auto h-8 w-8 mb-2"/>
                <p>No new transactions required analysis.</p>
            </div>
        )
    }

    return (
        <Collapsible>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {result.analyzedTransactions.map(tx => (
                        <Collapsible key={tx.id} asChild>
                            <>
                                <CollapsibleTrigger asChild>
                                    <TableRow className="cursor-pointer hover:bg-muted/50">
                                        <TableCell><ChevronDown className="h-4 w-4" /></TableCell>
                                        <TableCell className="font-medium">{tx.source}</TableCell>
                                        <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                                        <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                                    </TableRow>
                                </CollapsibleTrigger>
                                <CollapsibleContent asChild>
                                    <tr className="bg-muted/50">
                                        <td colSpan={4} className="p-0">
                                            <div className="p-4">
                                                <h4 className="font-semibold mb-2 ml-4">Itemized Tax Breakdown</h4>
                                                <div className="space-y-2 pl-8">
                                                    {tx.items?.map(item => (
                                                        <div key={item.id} className="p-2 border rounded-md bg-background">
                                                            <p className="font-semibold">{item.description}</p>
                                                            <div className="grid grid-cols-2 gap-x-4 text-sm font-mono mt-1">
                                                                <p>Shop Fee: <span className="float-right">{formatCurrency(item.taxDetails?.shopFee || 0)}</span></p>
                                                                <p>VAT: <span className="float-right">{formatCurrency(item.taxDetails?.vat || 0)}</span></p>
                                                                <p>Tariff: <span className="float-right">{formatCurrency(item.taxDetails?.tariff || 0)}</span></p>
                                                                <p>Other: <span className="float-right">{formatCurrency(item.taxDetails?.otherTaxes || 0)}</span></p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </CollapsibleContent>
                            </>
                        </Collapsible>
                    ))}
                </TableBody>
            </Table>
        </Collapsible>
    );
}
