

'use client';

import { useState, useMemo, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar as CalendarIcon, FileDown, AreaChart, FileText, BarChart2 } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart as RechartsBarChart, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import type { Transaction } from '@/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { Tooltip, TooltipProvider, TooltipContent } from '@/components/ui/tooltip';


type ReportType = 'monthly' | 'yearly' | 'custom';
type ReportData = {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    chartData: { name: string; total: number }[];
    count: number;
    period: string;
    transactions: Transaction[];
  };

export default function ReportsPage() {
  const { transactions, allCategories, formatCurrency, showNotification, isPremium, canGenerateReport, generateReportWithLimit } = useAppContext();
  
  const [reportType, setReportType] = useState<ReportType>('monthly');
  const [date, setDate] = useState<Date>(new Date());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(
    allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);

  // Effect to update selected categories when allCategories from context changes
  useEffect(() => {
    setSelectedCategories(prev => 
      allCategories.reduce((acc, cat) => ({ ...acc, [cat]: prev[cat] ?? true }), {})
    );
  }, [allCategories]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => ({
      ...prev,
      [category]: !prev[category],
    }));
  };
  
  const activeCategories = useMemo(() => {
    return Object.entries(selectedCategories)
        .filter(([, isSelected]) => isSelected)
        .map(([category]) => category);
  }, [selectedCategories]);


  const handleGenerateReport = async () => {
    const canProceed = await generateReportWithLimit();
    if (!canProceed) return;

    let startDate, endDate;

    switch (reportType) {
      case 'monthly':
        startDate = startOfMonth(date);
        endDate = endOfMonth(date);
        break;
      case 'yearly':
        startDate = startOfYear(date);
        endDate = endOfYear(date);
        break;
      case 'custom':
        if (!dateRange?.from || !dateRange?.to) {
          showNotification({
            type: "error",
            title: "Invalid Date Range",
            description: "Please select a start and end date for the custom report.",
          })
          return;
        }
        startDate = dateRange.from;
        endDate = dateRange.to;
        break;
    }

    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      const isDateInRange = transactionDate >= startDate! && transactionDate <= endDate!;
      const isCategoryMatch = activeCategories.includes(t.category);
      return isDateInRange && isCategoryMatch;
    });
    
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIncome - totalExpenses;
    
    const expenseByCategory = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
            if (!acc[t.category]) {
                acc[t.category] = 0;
            }
            acc[t.category] += t.amount;
            return acc;
        }, {} as Record<string, number>);

    const chartData = Object.entries(expenseByCategory)
        .map(([name, total]) => ({ name, total }))
        .sort((a,b) => b.total - a.total);


    setGeneratedReport({
        totalIncome,
        totalExpenses,
        balance,
        chartData,
        count: filteredTransactions.length,
        period: `${format(startDate, 'LLL dd, y')} - ${format(endDate, 'LLL dd, y')}`,
        transactions: filteredTransactions
    });
  };

  const handleExportCSV = () => {
    if (!generatedReport) return;
    
    const csvData = generatedReport.transactions.map(t => ({
      Date: t.date,
      Source: t.source,
      Category: t.category,
      Type: t.type,
      Amount: t.amount,
      Notes: t.notes || ''
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (!generatedReport) return;
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.text("Financial Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Period: ${generatedReport.period}`, 14, 30);

    (doc as any).autoTable({
        startY: 40,
        body: [
            ['Total Income', formatCurrency(generatedReport.totalIncome)],
            ['Total Expenses', formatCurrency(generatedReport.totalExpenses)],
            ['Net Balance', formatCurrency(generatedReport.balance)],
        ],
        theme: 'striped'
    });

    const tableColumn = ["Date", "Source", "Category", "Type", "Amount"];
    const tableRows: (string | number)[][] = [];

    generatedReport.transactions.forEach(t => {
      const transactionData = [
        format(new Date(t.date), "yyyy-MM-dd"),
        t.source,
        t.category,
        t.type,
        formatCurrency(t.amount)
      ];
      tableRows.push(transactionData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: (doc as any).lastAutoTable.finalY + 10
    });
    
    doc.save(`report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const GenerateButton = (
    <Button onClick={handleGenerateReport} className="w-full sm:w-auto" disabled={!canGenerateReport}>
        <AreaChart className="mr-2 h-4 w-4" />
        Generate Report
    </Button>
  );
  
  const chartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Reports" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>
              Create custom financial reports based on your transaction data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report Type</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Summary</SelectItem>
                    <SelectItem value="yearly">Yearly Summary</SelectItem>
                    <SelectItem value="custom">Custom Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportType !== 'custom' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select {reportType === 'monthly' ? 'Month' : 'Year'}</label>
                   <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("w-full justify-start text-left font-normal")}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {format(date, reportType === 'monthly' ? "MMMM yyyy" : "yyyy")}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                            <Calendar
                            mode="single"
                            selected={date}
                            onSelect={(d) => setDate(d || new Date())}
                            initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
              ) : (
                <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                            ) : (
                            <span>Pick a date range</span>
                            )}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Categories</label>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start truncate">
                            {activeCategories.length} of {allCategories.length} selected
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                        <DropdownMenuLabel>Filter Categories</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allCategories.map((cat) => (
                             <DropdownMenuCheckboxItem
                                key={cat}
                                checked={selectedCategories[cat] ?? true}
                                onCheckedChange={() => handleCategoryChange(cat)}
                             >
                                {cat}
                             </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>

            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                {canGenerateReport ? GenerateButton : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>{GenerateButton}</TooltipTrigger>
                            <TooltipContent>
                                <p>You have used your free report for this month. Upgrade for more.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
                <div className="flex gap-2">
                    <Button variant="outline" className="w-full" disabled={!generatedReport} onClick={handleExportCSV}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button variant="outline" className="w-full" disabled={!generatedReport} onClick={handleExportPDF}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {generatedReport ? (
            <Card>
                <CardHeader>
                    <CardTitle>Report Summary</CardTitle>
                    <CardDescription>Showing results for {generatedReport.period}. Found {generatedReport.count} transactions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(generatedReport.totalIncome)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(generatedReport.totalExpenses)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={cn("text-2xl font-bold", generatedReport.balance >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCurrency(generatedReport.balance)}</div>
                            </CardContent>
                        </Card>
                    </div>
                    {generatedReport.chartData.length > 0 && (
                        <div>
                        <h3 className="font-headline text-lg font-semibold mb-4">Expense Breakdown by Category</h3>
                        <div className="h-[350px]">
                          <ChartContainer config={chartConfig} className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsBarChart
                                data={generatedReport.chartData}
                                layout="vertical"
                                margin={{ left: 10, right: 10, top: 10, bottom: 10 }}
                                >
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    stroke="hsl(var(--muted-foreground))"
                                    tick={{ fontSize: 12 }}
                                    width={100}
                                />
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                    formatter={(value) => formatCurrency(value as number)}
                                    indicator="dot"
                                    />}
                                />
                                <Bar dataKey="total" fill="var(--color-total)" radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                            </ResponsiveContainer>
                          </ChartContainer>
                        </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        ) : (
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
            <BarChart2 className="mx-auto h-12 w-12 mb-4" />
            <p className="text-lg font-semibold">No report generated yet.</p>
            <p>Use the controls above to generate a new report.</p>
          </div>
        )}
      </main>
    </div>
  );
}
