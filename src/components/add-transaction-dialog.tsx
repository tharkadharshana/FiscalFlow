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
import { ScanLine, MinusCircle, PlusCircle } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { IncomeEntryForm } from './income-entry-form';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
};

export function AddTransactionDialog({ open, onOpenChange, transactionToEdit }: AddTransactionDialogProps) {
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
                    <TabsTrigger value="scan">
                      <ScanLine className="mr-2 h-4 w-4" />
                      Scan Receipt
                    </TabsTrigger>
                  )}
              </TabsList>
              <TabsContent value="expense" className="pt-4">
                  <ManualEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
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
