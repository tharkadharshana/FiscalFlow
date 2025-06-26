'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Mic } from 'lucide-react';
import { AddTransactionDialog } from '../add-transaction-dialog';
import { VoiceAssistantDialog } from '../voice-assistant-dialog';
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationPopover } from '../notifications/notification-popover';

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsVoiceAssistantOpen(true)} variant="outline" size="icon" className="h-9 w-9">
            <Mic className="h-4 w-4" />
            <span className="sr-only">Voice Assistant</span>
          </Button>
          <NotificationPopover />
          <Button onClick={() => setIsAddTransactionOpen(true)} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </div>
      </header>
      <AddTransactionDialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen} />
      <VoiceAssistantDialog open={isVoiceAssistantOpen} onOpenChange={setIsVoiceAssistantOpen} />
    </>
  );
}
