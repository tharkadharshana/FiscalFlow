

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
import type { Transaction, ChecklistItem } from '@/types';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import Link from 'next/link';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
  itemToConvert?: { checklistId: string; item: ChecklistItem } | null;
};

export function AddTransactionDialog({ open, onOpenChange, transactionToEdit, itemToConvert }: AddTransactionDialogProps) {
  const { canScanReceipt } = useAppContext();
  
  const ScanReceiptTab = (
     <TabsTrigger value="scan" disabled={!canScanReceipt}>
        <ScanLine className="mr-2 h-4 w-4" />
        Scan Receipt
        {!canScanReceipt && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
      </TabsTrigger>
  );
  
  const defaultTab = transactionToEdit?.type || (itemToConvert ? 'expense' : 'expense');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] flex h-full max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{transactionToEdit ? 'Edit' : (itemToConvert ? 'Confirm Transaction' : 'Add Transaction')}</DialogTitle>
          <DialogDescription>
            {transactionToEdit ? 'Update the details of your transaction.' : (itemToConvert ? 'Confirm the details for this checklist item.' : 'Log a new income or expense.')}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="pr-2">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className={cn("grid w-full", (transactionToEdit || itemToConvert) ? "grid-cols-2" : "grid-cols-3")}>
                  <TabsTrigger value="expense">
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Expense
                  </TabsTrigger>
                  <TabsTrigger value="income">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Income
                  </TabsTrigger>
                  {!(transactionToEdit || itemToConvert) && (
                    canScanReceipt ? ScanReceiptTab : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {/* The extra div is needed for Tooltip to correctly attach to a disabled element */}
                            <div>{ScanReceiptTab}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>You've used your monthly receipt scans. Upgrade for unlimited.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  )}
              </TabsList>
              <TabsContent value="expense" className="pt-4">
                  <ManualEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} itemToConvert={itemToConvert} />
              </TabsContent>
              <TabsContent value="income" className="pt-4">
                  <IncomeEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
              </TabsContent>
              {!transactionToEdit && (
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
