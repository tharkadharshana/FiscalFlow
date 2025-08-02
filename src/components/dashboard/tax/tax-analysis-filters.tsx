

'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { type DateRange } from 'react-day-picker';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppContext } from '@/contexts/app-context';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Transaction } from '@/types/schemas';

type TaxAnalysisFiltersProps = {
  onAnalyze: (filteredTransactions: Transaction[]) => void;
  isAnalyzing: boolean;
};

export function TaxAnalysisFilters({ onAnalyze, isAnalyzing }: TaxAnalysisFiltersProps) {
  const { transactions, allCategories, canRunTaxAnalysis, taxRules } = useAppContext();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>(
    allCategories.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );

  const activeCategories = useMemo(() => {
    return Object.entries(selectedCategories)
      .filter(([, isSelected]) => isSelected)
      .map(([category]) => category);
  }, [selectedCategories]);

  const handleAnalyzeClick = () => {
    const filteredTransactions = transactions.filter(t => {
      if (!dateRange?.from || !dateRange?.to) return false;
      const transactionDate = new Date(t.date);
      const isDateInRange = transactionDate >= dateRange.from && transactionDate <= dateRange.to;
      const isCategoryMatch = activeCategories.includes(t.category);
      return isDateInRange && isCategoryMatch && t.type === 'expense';
    });
    onAnalyze(filteredTransactions);
  };

  const isReadyToAnalyze = canRunTaxAnalysis && !!taxRules;

  const RunAnalysisButton = (
    <Button onClick={handleAnalyzeClick} disabled={isAnalyzing || !isReadyToAnalyze}>
        {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : 'Run AI Analysis'}
    </Button>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Filters</CardTitle>
        <CardDescription>Select the expense transactions you want the AI to analyze.</CardDescription>
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
              <Button variant="outline" className="w-full justify-start truncate">{activeCategories.length} of {allCategories.length} selected</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
              <DropdownMenuLabel>Filter Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allCategories.map((cat) => (
                <DropdownMenuCheckboxItem key={cat} checked={selectedCategories[cat] ?? true} onCheckedChange={() => setSelectedCategories(prev => ({...prev, [cat]: !prev[cat]}))}>
                  {cat}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-end">
          <TooltipProvider>
            {!isReadyToAnalyze ? (
                <Tooltip>
                    <TooltipTrigger asChild>{RunAnalysisButton}</TooltipTrigger>
                    <TooltipContent>
                        <p>{!taxRules ? "Loading tax rules..." : "You have used your free tax analysis for this month."}</p>
                    </TooltipContent>
                </Tooltip>
            ) : RunAnalysisButton}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
