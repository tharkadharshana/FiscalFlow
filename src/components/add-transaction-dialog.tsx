
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManualEntryForm } from './manual-entry-form';
import { ReceiptScanner } from './receipt-scanner';
import { ScanLine, MinusCircle, PlusCircle, Sparkles } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { IncomeEntryForm } from './income-entry-form';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
};

export function AddTransactionDialog({ open, onOpenChange, transactionToEdit }: AddTransactionDialogProps) {
  const { isPremium } = useAppContext();
  
  const ScanReceiptTab = (
     <TabsTrigger value="scan" disabled={!isPremium}>
        <ScanLine className="mr-2 h-4 w-4" />
        Scan Receipt
        {!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
      </TabsTrigger>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] flex h-full max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{transactionToEdit ? 'Edit' : 'Add'} Transaction</DialogTitle>
          <DialogDescription>
            {transactionToEdit ? 'Update the details of your transaction.' : 'Log a new income or expense.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="pr-2">
            <Tabs defaultValue={transactionToEdit?.type || 'expense'} className="w-full">
              <TabsList className={cn("grid w-full", transactionToEdit ? "grid-cols-2" : "grid-cols-3")}>
                  <TabsTrigger value="expense">
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Expense
                  </TabsTrigger>
                  <TabsTrigger value="income">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Income
                  </TabsTrigger>
                  {!transactionToEdit && (
                    isPremium ? ScanReceiptTab : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {ScanReceiptTab}
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Upgrade to Premium to scan receipts with AI</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  )}
              </TabsList>
              <TabsContent value="expense" className="pt-4">
                  <ManualEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
              </TabsContent>
              <TabsContent value="income" className="pt-4">
                  <IncomeEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
              </TabsContent>
              {!transactionToEdit && isPremium && (
                <TabsContent value="scan" className="pt-4">
                    <ReceiptScanner onTransactionAdded={() => onOpenChange(false)} />
                </TabsContent>
              )}
            </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
