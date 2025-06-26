'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddTransactionDialog } from '../add-transaction-dialog';
import { useState } from 'react';

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  return (
    <>
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
      <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>
      <Button onClick={() => setIsDialogOpen(true)} className="gap-1">
        <PlusCircle className="h-4 w-4" />
        <span className="hidden sm:inline">Add Transaction</span>
      </Button>
    </header>
    <AddTransactionDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}
