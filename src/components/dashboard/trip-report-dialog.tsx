
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAppContext } from '@/contexts/app-context';
import type { TripPlan, TripItem } from '@/types';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';

type TripReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripPlan | null;
};

export function TripReportDialog({ open, onOpenChange, trip }: TripReportDialogProps) {
  const { formatCurrency, transactions } = useAppContext();
  
  const tripTransactions = useMemo(() => {
    if (!trip) return [];
    return transactions.filter(t => t.tripId === trip.id);
  }, [trip, transactions]);
  
  if (!trip) return null;

  const getCategoryFromItem = (item: TripItem) => {
    const tx = tripTransactions.find(t => t.tripItemId === item.id);
    return tx?.category || item.category;
  }
  
  const totalDifference = trip.totalActualCost - trip.totalPredictedCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Trip Report: {trip.title}</DialogTitle>
          <DialogDescription>
            A summary of your planned vs. actual spending for this trip.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Predicted Budget</p>
                        <p className="text-xl font-bold">{formatCurrency(trip.totalPredictedCost)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground">Actual Spend</p>
                        <p className="text-xl font-bold">{formatCurrency(trip.totalActualCost)}</p>
                    </CardContent>
                </Card>
                 <Card className={cn(totalDifference > 0 && 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800')}>
                    <CardContent className="p-4">
                        <p className={cn("text-sm text-muted-foreground", totalDifference > 0 && "text-red-700 dark:text-red-300")}>Difference</p>
                        <p className={cn("text-xl font-bold", totalDifference > 0 ? "text-red-600 dark:text-red-400" : "text-green-600")}>
                            {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                        </p>
                    </CardContent>
                </Card>
            </div>
            <ScrollArea className="h-80 rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Predicted</TableHead>
                            <TableHead className="text-right">Actual</TableHead>
                            <TableHead className="text-right">Difference</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trip.items.map(item => {
                            const actual = item.actualCost || 0;
                            const difference = actual - item.predictedCost;
                            return (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell><Badge variant="outline">{getCategoryFromItem(item)}</Badge></TableCell>
                                    <TableCell className="text-right">{formatCurrency(item.predictedCost)}</TableCell>
                                    <TableCell className="text-right">{formatCurrency(actual)}</TableCell>
                                    <TableCell className={cn("text-right", difference > 0 ? "text-red-600" : "text-green-600")}>
                                        {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
