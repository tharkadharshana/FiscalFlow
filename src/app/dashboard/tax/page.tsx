

'use client';

import { useMemo, useState, useEffect } from 'react';
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
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Calculator, FileText, Car, Percent, Landmark, Wallet, Loader2, ChevronDown, BookOpen, Sparkles, AlertCircle, ShoppingBasket, Info, AreaChart } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { useTranslation } from '@/contexts/translation-context';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth } from 'date-fns';

export default function TaxPage() {
    const { t } = useTranslation();
    const { userProfile, transactions, formatCurrency, isPremium, canRunTaxAnalysis, analyzeTaxesWithLimit, allCategories } = useAppContext();
    
    // State for UI and analysis results
    const [analysisResult, setAnalysisResult] = useState<AnalyzeTaxesOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    // State for filters
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: new Date() });
    const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
    const [taxDocument, setTaxDocument] = useState<string>('');
    const [isDocsOpen, setIsDocsOpen] = useState(false);

    useEffect(() => {
        setSelectedCategories(
            allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
        );
    }, [allCategories]);

    const activeCategories = useMemo(() => {
        return Object.entries(selectedCategories)
            .filter(([, isSelected]) => isSelected)
            .map(([category]) => category);
    }, [selectedCategories]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => ({
          ...prev,
          [category]: !prev[category],
        }));
    };
    
    const transactionsToAnalyze = useMemo(() => {
        return transactions.filter(t => {
            if (t.isTaxAnalyzed) return false;
            
            const transactionDate = new Date(t.date);
            const isDateInRange = dateRange?.from && dateRange?.to ? (transactionDate >= dateRange.from && transactionDate <= dateRange.to) : true;
            const isCategoryMatch = activeCategories.includes(t.category);

            return isDateInRange && isCategoryMatch;
        });
    }, [transactions, dateRange, activeCategories]);
    
    const handleAnalyzeTaxes = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        const result = await analyzeTaxesWithLimit({
            transactions: transactionsToAnalyze.map(t => ({
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
        }
        setIsAnalyzing(false);
    }

  const RunAnalysisButton = (
    <Button onClick={handleAnalyzeTaxes} disabled={isAnalyzing || !canRunTaxAnalysis || transactionsToAnalyze.length === 0}>
        {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" />Run AI Analysis</>}
    </Button>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title={t('sidebar.tax')} />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="overview">
            <div className='flex justify-between items-center mb-4'>
                <TabsList className="grid grid-cols-2 h-auto">
                    <TabsTrigger value="overview"><FileText className="mr-2 h-4 w-4"/>AI Analysis</TabsTrigger>
                    <TabsTrigger value="calculators"><Calculator className="mr-2 h-4 w-4"/>Calculators</TabsTrigger>
                </TabsList>
            </div>
            
            <TabsContent value="overview">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            AI Tax Analysis Engine
                            {!isPremium && <Sparkles className="h-5 w-5 text-amber-500" />}
                        </CardTitle>
                        <CardDescription>
                            Select filters to analyze specific transactions for indirect taxes. The AI will only process transactions that haven't been analyzed before.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2 lg:col-span-2">
                                <Label>Date Range</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange?.from ? (dateRange.to ? (<> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date</span>)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label>Categories</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-start truncate">{activeCategories.length} of {allCategories.length} selected</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                                        <DropdownMenuLabel>Filter Categories</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {allCategories.map((cat) => (<DropdownMenuCheckboxItem key={cat} checked={selectedCategories[cat]} onCheckedChange={() => handleCategoryChange(cat)}>{cat}</DropdownMenuCheckboxItem>))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="space-y-2">
                                <Label className="opacity-0">Generate</Label>
                                {canRunTaxAnalysis ? RunAnalysisButton : (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>{RunAnalysisButton}</TooltipTrigger>
                                            <TooltipContent><p>You have used your free tax analysis for this month. Upgrade for more.</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        </div>
                        <Alert variant="default">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Found <strong>{transactionsToAnalyze.length}</strong> un-analyzed transactions matching your criteria.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                    
                    <Collapsible open={isDocsOpen} onOpenChange={setIsDocsOpen} className="px-6 pb-6">
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-start px-2 gap-2 -ml-2">
                                <ChevronDown className={`h-4 w-4 transition-transform ${isDocsOpen && 'rotate-180'}`} />
                                <BookOpen className="h-4 w-4" />
                                <span>Provide Custom Tax Documentation (Optional)</span>
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-2 pt-2">
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

                    {isAnalyzing ? (
                        <div className="flex justify-center items-center h-40 border-t">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">AI is analyzing your transactions...</p>
                        </div>
                    ) : analysisResult ? (
                        <div className="border-t pt-4"><AnalyzedTransactionsTable result={analysisResult} /></div>
                    ) : analysisError ? (
                        <div className="border-t pt-4">
                            <Alert variant="destructive">
                                <AlertTitle>Analysis Failed</AlertTitle>
                                <AlertDescription>{analysisError}</AlertDescription>
                            </Alert>
                        </div>
                    ) : null}
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
        <div className="space-y-2 px-6 pb-6">
          <p className="text-sm text-muted-foreground">Analysis complete. Found {result.analyzedTransactions.length} transactions to analyze. Click a row to expand.</p>
          
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
                                                          <div key={item.id} className="p-3 border rounded-md bg-background">
                                                              <p className="font-semibold">{item.description}</p>
                                                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 text-sm font-mono mt-1">
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
          
        </div>
    );
}

