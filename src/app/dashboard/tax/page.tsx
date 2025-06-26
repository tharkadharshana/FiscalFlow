
'use client';

import { useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileDown, Calculator } from 'lucide-react';
import { TaxCalculator } from '@/components/dashboard/tax-calculator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function TaxPage() {
    const { transactions } = useAppContext();

    const taxData = useMemo(() => {
        const taxableIncome = transactions
            .filter(t => t.type === 'income' && t.isTaxDeductible)
            .reduce((sum, t) => sum + t.amount, 0);

        const deductibleExpenses = transactions
            .filter(t => t.type === 'expense' && t.isTaxDeductible)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const deductibleTransactions = transactions.filter(t => t.isTaxDeductible).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Placeholder for tax calculation logic
        const estimatedTaxLiability = (taxableIncome - deductibleExpenses) * 0.15; // Simplified 15% rate

        return { taxableIncome, deductibleExpenses, deductibleTransactions, estimatedTaxLiability: Math.max(0, estimatedTaxLiability) };
    }, [transactions]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(amount);
    };

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Tax Center" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
          <Tabs defaultValue="overview">
            <div className='flex justify-between items-center mb-4'>
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="calculators">Calculators</TabsTrigger>
                </TabsList>
                <Button variant="outline"><FileDown className="mr-2 h-4 w-4"/>Export Tax Report</Button>
            </div>
            
            <TabsContent value="overview">
                <div className="grid gap-6 md:grid-cols-3 mb-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Taxable Income</CardTitle>
                            <CardDescription>Total income marked as taxable this year.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{formatCurrency(taxData.taxableIncome)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Deductible Expenses</CardTitle>
                            <CardDescription>Total expenses marked as deductible this year.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold">{formatCurrency(taxData.deductibleExpenses)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Estimated Tax Due</CardTitle>
                            <CardDescription>A simplified estimate. Consult a professional.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-bold text-primary">{formatCurrency(taxData.estimatedTaxLiability)}</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle>Tax-Related Transactions</CardTitle>
                        <CardDescription>All income and expenses you've marked for tax purposes.</CardDescription>
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
                                {taxData.deductibleTransactions.length > 0 ? (
                                    taxData.deductibleTransactions.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell>{format(parseISO(t.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium">{t.source}</TableCell>
                                            <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={t.type === 'income' ? 'secondary' : 'default'}>{t.type}</Badge>
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
                        <CardTitle className="flex items-center gap-2"><Calculator /> Sri Lankan Vehicle Import Tax Calculator</CardTitle>
                        <CardDescription>
                           Estimate the total taxes and landed cost for importing a vehicle into Sri Lanka based on the latest regulations.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <TaxCalculator />
                    </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
