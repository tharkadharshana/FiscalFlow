
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

const onboardingSteps = [
    {
      title: "Welcome to FiscalFlow!",
      description: "Let's take a quick tour to get you started on your financial journey.",
      image: "https://placehold.co/600x400.png",
      aiHint: "welcome handshake",
    },
    {
      title: "Log Your First Transaction",
      description: "Click the 'Add Transaction' button in the header to log your income and expenses. Keeping a record is the first step to financial clarity.",
      image: "https://placehold.co/600x400.png",
      aiHint: "writing list",
    },
    {
      title: "Set Your Budgets",
      description: "Head to the 'Budgets' page to set monthly spending limits for different categories. We'll warn you when you're getting close!",
      image: "https://placehold.co/600x400.png",
      aiHint: "target goal",
    },
    {
      title: "Unlock AI Superpowers",
      description: "Upgrade to Premium to scan receipts, get smart insights, and use our AI Financial Planner to build detailed plans for your biggest goals.",
      image: "https://placehold.co/600x400.png",
      aiHint: "robot brain",
    },
];

type OnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function OnboardingDialog({ open, onOpenChange }: OnboardingDialogProps) {
  const { markOnboardingComplete } = useAppContext();

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      markOnboardingComplete();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Getting Started</DialogTitle>
            <DialogDescription>A quick guide to FiscalFlow.</DialogDescription>
        </DialogHeader>
        <Carousel className="w-full">
            <CarouselContent>
                {onboardingSteps.map((step, index) => (
                    <CarouselItem key={index}>
                        <div className="p-1 text-center space-y-4">
                            <div className="aspect-video w-full relative overflow-hidden rounded-lg">
                                <Image 
                                    src={step.image} 
                                    alt={step.title} 
                                    data-ai-hint={step.aiHint}
                                    fill
                                    className="object-cover"
                                />
                            </div>
                            <h3 className="font-semibold text-lg">{step.title}</h3>
                            <p className="text-muted-foreground">{step.description}</p>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">
              Get Started
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
