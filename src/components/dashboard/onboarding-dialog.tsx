
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
  } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-context';
import Image from 'next/image';
import { onboardingSteps } from '@/data/onboarding-steps';
import { Checkbox } from '../ui/checkbox';
import { useState } from 'react';
import { Label } from '../ui/label';
import { useTranslation } from '@/contexts/translation-context';


type OnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { updateUserPreferences } = useAppContext();
  const { t } = useTranslation();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = async (isOpen: boolean) => {
    if (!isOpen) { // When dialog is closing
        if (dontShowAgain) {
            await updateUserPreferences({ showOnboardingOnLogin: false });
        }
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="font-headline text-2xl">{t('onboarding.title')}</DialogTitle>
            <DialogDescription>{t('onboarding.description')}</DialogDescription>
        </DialogHeader>
        <Carousel className="w-full">
            <CarouselContent>
                {onboardingSteps.map((step, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1 text-center space-y-4">
                            <div className="aspect-video w-full relative overflow-hidden rounded-lg">
                                <Image 
                                    src={step.image} 
                                    alt={t(step.titleKey)} 
                                    data-ai-hint={step.aiHint}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <h3 className="font-semibold text-lg">{t(step.titleKey)}</h3>
                            <p className="text-muted-foreground">{t(step.descriptionKey)}</p>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
        <DialogFooter className="sm:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
            <Label htmlFor="dont-show-again" className="text-sm text-muted-foreground">{t('onboarding.dontShowAgain')}</Label>
          </div>
          <DialogClose asChild>
            <Button type="button">
              {t('onboarding.getStarted')}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
