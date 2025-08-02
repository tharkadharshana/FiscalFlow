

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
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Calculator, FileText, Car, Percent, Landmark, Wallet, Loader2, ChevronDown, BookOpen, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { VehicleImportCalculator } from '@/components/dashboard/tax/vehicle-import-calculator';
import { IncomeTaxCalculator } from '@/components/dashboard/tax/income-tax-calculator';
import { VatCalculator } from '@/components/dashboard/tax/vat-calculator';
import { StampDutyCalculator } from '@/components/dashboard/tax/stamp-duty-calculator';
import type { AnalyzeTaxesOutput, Transaction } from '@/types/schemas';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { sriLankaTaxRules } from '@/data/tax-rules';
import { TaxSettings } from '@/types';


export default function TaxPage() {
    const { userProfile, transactions, formatCurrency, isPremium, canRunTaxAnalysis, analyzeTaxesWithLimit, showNotification, taxRules, updateTaxRules } = useAppContext();
    const [analysisResult, setAnalysisResult] = useState<AnalyzeTaxesOutput | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [isDocsOpen, setIsDocsOpen] = useState(false);
    const [isLogicEditorOpen, setIsLogicEditorOpen] = useState(false);

    // Filter states
    const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
    const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(
        useAppContext().allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
    );

    const [editableTaxRules, setEditableTaxRules] = useState<TaxSettings>(taxRules || sriLankaTaxRules);

    useEffect(() => {
        setEditableTaxRules(taxRules || sriLankaTaxRules);
    }, [taxRules]);

    const handleRuleChange = (path: string, value: any) => {
        setEditableTaxRules(prev => {
            const keys = path.split('.');
            const newRules = JSON.parse(JSON.stringify(prev));
            let current = newRules;
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = value;
            return newRules;
        });
    };

    const handleSaveRules = async () => {
        if (!userProfile?.countryCode) return;
        await updateTaxRules(userProfile.countryCode, editableTaxRules);
    };

    const activeCategories = useMemo(() => {
        return Object.entries(selectedCategories)
            .filter(([, isSelected]) => isSelected)
            .map(([category]) => category);
    }, [selectedCategories]);
    
    const handleAnalyzeTaxes = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setAnalysisError(null);

        const filteredTransactions = transactions.filter(t => {
            if (!dateRange?.from || !dateRange?.to) return false;
            const transactionDate = new Date(t.date);
            const isDateInRange = transactionDate >= dateRange.from && transactionDate <= dateRange.to;
            const isCategoryMatch = activeCategories.includes(t.category);
            return isDateInRange && isCategoryMatch;
        });

        if (filteredTransactions.length === 0) {
            showNotification({ type: 'warning', title: 'No Transactions Found', description: 'There are no transactions matching your filter criteria.' });
            setIsAnalyzing(false);
            return;
        }

        const unanalyzedTransactions = filteredTransactions.filter(t => !t.isTaxAnalyzed);

        if (unanalyzedTransactions.length === 0) {
            showNotification({ type: 'info', title: 'Already Analyzed', description: 'All transactions in this period have already been analyzed.' });
            setAnalysisResult({ analyzedTransactions: filteredTransactions });
            setIsAnalyzing(false);
            return;
        }

        const result = await analyzeTaxesWithLimit({ transactions: unanalyzedTransactions });
        
        if (result && 'error' in result) {
            setAnalysisError(result.error);
        } else if (result) {
            const finalResults = [...transactions.filter(t => t.isTaxAnalyzed), ...result.analyzedTransactions];
            setAnalysisResult({ analyzedTransactions: finalResults });
        }
        setIsAnalyzing(false);
    }

  const RunAnalysisButton = (
    <Button onClick={handleAnalyzeTaxes} disabled={isAnalyzing || !canRunTaxAnalysis}>
        {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : 'Run AI Analysis'}
    </Button>
  );

  return (
    <TooltipProvider>
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
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Filters</CardTitle>
                        <CardDescription>Select the transactions you want the AI to analyze.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2 lg:col-span-2">
                            <Label>Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
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
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start truncate">{activeCategories.length} of {useAppContext().allCategories.length} selected</Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                                    <DropdownMenuLabel>Filter Categories</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {useAppContext().allCategories.map((cat) => (
                                        <DropdownMenuCheckboxItem key={cat} checked={selectedCategories[cat] ?? true} onCheckedChange={() => setSelectedCategories(prev => ({...prev, [cat]: !prev[cat]}))}>
                                            {cat}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <div className="flex items-end">
                            {canRunTaxAnalysis ? RunAnalysisButton : (
                                <Tooltip>
                                    <TooltipTrigger asChild>{RunAnalysisButton}</TooltipTrigger>
                                    <TooltipContent><p>You have used your free tax analysis for this month. Upgrade for more.</p></TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            AI Tax Analysis Engine
                            {!isPremium && <Sparkles className="h-5 w-5 text-amber-500" />}
                        </CardTitle>
                        <CardDescription>
                            Automatically detect potential tax liabilities based on your transaction history and selected country.
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
                                        <TableHead>Date</TableHead>
                                        <TableHead>Source</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead className="text-right">Total Price</TableHead>
                                        <TableHead className="text-right">Shop Fee</TableHead>
                                        <TableHead className="text-right">Total Tax</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.analyzedTransactions.length > 0 ? (
                                        analysisResult.analyzedTransactions.map((tx: any) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>{format(new Date(tx.date), "yyyy-MM-dd")}</TableCell>
                                                <TableCell>{tx.source}</TableCell>
                                                <TableCell><Badge variant="outline">{tx.category}</Badge></TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(tx.amount)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(tx.items[0]?.taxDetails?.shopFee || 0)}</TableCell>
                                                <TableCell className="text-right font-mono">{formatCurrency(tx.items[0]?.taxDetails?.totalTax || 0)}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center h-24">No tax liabilities detected.</TableCell>
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
                                <p>Select your filters and click the button above to start the analysis.</p>
                            </div>
                        )}
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
    </TooltipProvider>
  );
}
