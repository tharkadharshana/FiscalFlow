

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
import { ScanLine, MinusCircle, PlusCircle, Sparkles, FileText } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { IncomeEntryForm } from './income-entry-form';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/app-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { StatementImporter } from './statement-importer';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: Transaction | null;
};

export function AddTransactionDialog({ open, onOpenChange, transactionToEdit }: AddTransactionDialogProps) {
  const { canScanReceipt, isPremium } = useAppContext();
  
  const ScanReceiptTab = (
     <TabsTrigger value="scan" disabled={!canScanReceipt}>
        <ScanLine className="mr-2 h-4 w-4" />
        Scan Receipt
        {!canScanReceipt && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
      </TabsTrigger>
  );

  const ImportStatementTab = (
    <TabsTrigger value="import" disabled={!isPremium}>
        <FileText className="mr-2 h-4 w-4" />
        Import Statement
        {!isPremium && <Sparkles className="ml-2 h-4 w-4 text-amber-500" />}
    </TabsTrigger>
  );
  
  const defaultTab = transactionToEdit?.type || 'expense';
  
  const isEditing = !!transactionToEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] flex h-full max-h-[90svh] flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline">{transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
          <DialogDescription>
            {transactionToEdit ? 'Update the details of your transaction.' : 'Log a new income, expense, or scan a receipt.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="pr-2">
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className={cn("grid w-full", isEditing ? "grid-cols-2" : "grid-cols-4")}>
                  <TabsTrigger value="expense">
                    <MinusCircle className="mr-2 h-4 w-4" />
                    Expense
                  </TabsTrigger>
                  <TabsTrigger value="income">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Income
                  </TabsTrigger>
                  {!isEditing && (
                    <>
                    {canScanReceipt ? ScanReceiptTab : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>{ScanReceiptTab}</div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>You've used your monthly receipt scans. Upgrade for unlimited.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    {isPremium ? ImportStatementTab : (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild><div>{ImportStatementTab}</div></TooltipTrigger>
                                <TooltipContent><p>Upgrade to Premium to import statements.</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    </>
                  )}
              </TabsList>
              <TabsContent value="expense" className="pt-4">
                  <ManualEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
              </TabsContent>
              <TabsContent value="income" className="pt-4">
                  <IncomeEntryForm onFormSubmit={() => onOpenChange(false)} transactionToEdit={transactionToEdit} />
              </TabsContent>
              {!isEditing && (
                <>
                <TabsContent value="scan" className="pt-4">
                    <ReceiptScanner onTransactionAdded={() => onOpenChange(false)} />
                </TabsContent>
                <TabsContent value="import" className="pt-4">
                    <StatementImporter onTransactionsAdded={() => onOpenChange(false)} />
                </TabsContent>
                </>
              )}
            </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
