
'use client';
import { Button } from '@/components/ui/button';
import { PlusCircle, Mic } from 'lucide-react';
import { AddTransactionDialog } from '../add-transaction-dialog';
import { VoiceAssistantDialog } from '../voice-assistant-dialog';
import { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NotificationPopover } from '../notifications/notification-popover';
import { useAppContext } from '@/contexts/app-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/contexts/translation-context';

type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  const { isPremium } = useAppContext();
  const { t } = useTranslation();
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  const handleVoiceClick = () => {
    if (isPremium) {
      logger.info('Voice assistant opened');
      setIsVoiceAssistantOpen(true);
    } else {
      logger.warn('Attempted to open voice assistant as free user');
    }
  };

  const handleAddTransactionClick = () => {
    logger.info('Add transaction dialog opened');
    setIsAddTransactionOpen(true);
  }

  const VoiceButton = (
    <Button
      onClick={handleVoiceClick}
      variant="outline"
      size="icon"
      className="h-9 w-9"
      disabled={!isPremium}
    >
      <Mic className="h-4 w-4" />
      <span className="sr-only">Voice Assistant</span>
    </Button>
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-headline text-xl font-semibold md:text-2xl">{title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {isPremium ? (
             VoiceButton
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>{VoiceButton}</TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to Premium to use the Voice Assistant</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <NotificationPopover />
          <Button onClick={handleAddTransactionClick} className="gap-1">
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('header.addTransaction')}</span>
          </Button>
        </div>
      </header>
      <AddTransactionDialog open={isAddTransactionOpen} onOpenChange={setIsAddTransactionOpen} />
      {isPremium && <VoiceAssistantDialog open={isVoiceAssistantOpen} onOpenChange={setIsVoiceAssistantOpen} />}
    </>
  );
}
