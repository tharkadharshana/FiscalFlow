
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Transaction } from '@/types';
import { useAppContext } from '@/contexts/app-context';
import { format, parseISO } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type TransactionDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
};

export function TransactionDetailDialog({ open, onOpenChange, transaction }: TransactionDetailDialogProps) {
  const { formatCurrency } = useAppContext();

  if (!transaction) {
    return null;
  }

  const handleDownloadPdf = () => {
    if (!transaction) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(transaction.source, 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt for Transaction`, 105, 28, { align: 'center' });
    doc.text(format(parseISO(transaction.date), 'PPP p'), 105, 34, { align: 'center' });
    
    // Summary Info
    (doc as any).autoTable({
        startY: 45,
        body: [
            ['Category:', transaction.category],
            ['Payment Method:', transaction.receiptDetails?.paymentMethod || 'N/A'],
            ['Reference #:', transaction.receiptDetails?.receiptNumber || 'N/A'],
        ],
        theme: 'plain',
        styles: { fontSize: 10 },
    });

    // Items table
    const tableColumn = ["Item Description", "Qty", "Price"];
    const tableRows: (string | number)[][] = [];

    const items = transaction.items && transaction.items.length > 0 
      ? transaction.items 
      : [{ id: '1', description: transaction.notes || transaction.category, amount: transaction.amount }];

    items.forEach(item => {
        const itemData = [
            item.description,
            1, // Placeholder quantity
            formatCurrency(item.amount)
        ];
        tableRows.push(itemData);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: (doc as any).lastAutoTable.finalY + 10,
        theme: 'striped',
        headStyles: { fillColor: [33, 33, 33] }
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', 150, finalY + 10, { align: 'right' });
    doc.text(formatCurrency(transaction.amount), 200, finalY + 10, { align: 'right' });

    doc.save(`receipt-${transaction.id}.pdf`);
  };

  const receiptItems = transaction.items && transaction.items.length > 0 
    ? transaction.items 
    : [{ id: '1', description: transaction.notes || transaction.category, amount: transaction.amount }];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <div className="p-6 pb-2">
            <DialogHeader>
                <DialogTitle className="font-headline text-center text-2xl">{transaction.source}</DialogTitle>
                <DialogDescription className="text-center">
                    {format(parseISO(transaction.date), 'MMMM d, yyyy - h:mm a')}
                </DialogDescription>
            </DialogHeader>
        </div>
        <ScrollArea className="max-h-[60vh]">
          <div className="font-mono text-sm px-6 py-4 space-y-4">
              <div className="space-y-1">
                  {receiptItems.map(item => (
                      <div key={item.id} className="flex justify-between">
                          <p className="flex-1 truncate pr-4">{item.description}</p>
                          <p>{formatCurrency(item.amount)}</p>
                      </div>
                  ))}
              </div>

              <Separator className="my-4 border-dashed" />

              <div className="space-y-2 text-base">
                  <div className="flex justify-between font-bold">
                      <p>TOTAL</p>
                      <p>{formatCurrency(transaction.amount)}</p>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-2">
                      <p>Category:</p>
                      <p>{transaction.category}</p>
                  </div>
                   <div className="flex justify-between text-xs text-muted-foreground">
                      <p>Payment Method:</p>
                      <p>{transaction.receiptDetails?.paymentMethod || 'N/A'}</p>
                  </div>
              </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-2 bg-muted/50 sm:justify-end">
            <Button onClick={handleDownloadPdf} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
