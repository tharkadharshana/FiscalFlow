
'use client';

import { useState, useMemo } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, FileDown } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import type { Transaction } from '@/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

import { IncomeVsExpenseChart } from '@/components/dashboard/reports/income-vs-expense-chart';
import { SpendingByCategory } from '@/components/dashboard/reports/spending-by-category';
import { ReportSummaryCards } from '@/components/dashboard/reports/report-summary-cards';
import { BudgetPerformance } from '@/components/dashboard/reports/budget-performance';

export default function ReportsPage() {
  const { transactions, budgets, formatCurrency, showNotification, isPremium, canGenerateReport, generateReportWithLimit } = useAppContext();
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const filteredData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return {
        transactions: [],
        budgets: [],
        totalIncome: 0,
        totalExpenses: 0,
      };
    }
    
    const filteredTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= dateRange.from! && transactionDate <= dateRange.to!;
    });
    
    const reportMonth = format(dateRange.from, 'yyyy-MM');
    const filteredBudgets = budgets.filter(b => b.month === reportMonth);
    
    const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    return {
      transactions: filteredTransactions,
      budgets: filteredBudgets,
      totalIncome,
      totalExpenses
    };
  }, [transactions, budgets, dateRange]);

  const handleExportCSV = async () => {
    if (!await generateReportWithLimit()) return;
    if (filteredData.transactions.length === 0) {
        showNotification({ type: 'error', title: 'No Data to Export', description: 'There are no transactions in the selected date range.' });
        return;
    }
    const csvData = filteredData.transactions.map(t => ({
      Date: t.date, Source: t.source, Category: t.category, Type: t.type, Amount: t.amount, Notes: t.notes || ''
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    if (!await generateReportWithLimit()) return;
    if (filteredData.transactions.length === 0) {
        showNotification({ type: 'error', title: 'No Data to Export', description: 'There are no transactions in the selected date range.' });
        return;
    }
    const doc = new jsPDF();
    const period = `Period: ${format(dateRange!.from!, 'LLL dd, y')} - ${format(dateRange!.to!, 'LLL dd, y')}`;
    doc.setFontSize(22);
    doc.text("Financial Report", 14, 22);
    doc.setFontSize(12);
    doc.text(period, 14, 30);
    (doc as any).autoTable({
        startY: 40,
        body: [
            ['Total Income', formatCurrency(filteredData.totalIncome)],
            ['Total Expenses', formatCurrency(filteredData.totalExpenses)],
            ['Net Balance', formatCurrency(filteredData.totalIncome - filteredData.totalExpenses)],
        ],
        theme: 'striped'
    });
    const tableColumn = ["Date", "Source", "Category", "Type", "Amount"];
    const tableRows: (string | number)[][] = filteredData.transactions.map(t => [
      format(new Date(t.date), "yyyy-MM-dd"), t.source, t.category, t.type, formatCurrency(t.amount)
    ]);
    (doc as any).autoTable({
        head: [tableColumn], body: tableRows, startY: (doc as any).lastAutoTable.finalY + 10
    });
    doc.save(`report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Financial Reports" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
            <CardDescription>Select a date range to generate your financial summary.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
              <Popover>
                  <PopoverTrigger asChild>
                  <Button
                      id="date"
                      variant={"outline"}
                      className={cn("w-full justify-start text-left font-normal sm:w-[300px]", !dateRange && "text-muted-foreground")}
                  >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                      dateRange.to ? ( <> {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")} </> ) 
                      : ( format(dateRange.from, "LLL dd, y") )
                      ) : ( <span>Pick a date range</span> )}
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCSV} disabled={!isPremium}><FileDown /> CSV</Button>
                <Button variant="outline" onClick={handleExportPDF} disabled={!isPremium}><FileDown /> PDF</Button>
              </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <ReportSummaryCards data={filteredData} />
            <IncomeVsExpenseChart data={filteredData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SpendingByCategory data={filteredData} />
                <BudgetPerformance data={filteredData} />
            </div>
        </div>
      </main>
    </div>
  );
}
