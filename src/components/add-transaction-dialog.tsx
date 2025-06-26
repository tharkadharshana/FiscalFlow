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
import { ScanLine, PenSquare } from 'lucide-react';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddTransactionDialog({ open, onOpenChange }: AddTransactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Add Transaction</DialogTitle>
          <DialogDescription>
            Log a new income or expense, either manually or by scanning a receipt.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <PenSquare className="mr-2 h-4 w-4" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="scan">
              <ScanLine className="mr-2 h-4 w-4" />
              Scan Receipt
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="pt-4">
            <ManualEntryForm onFormSubmit={() => onOpenChange(false)} />
          </TabsContent>
          <TabsContent value="scan" className="pt-4">
            <ReceiptScanner onTransactionAdded={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
