

'use client';

import { useEffect, useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/app-context';
import type { SavingsGoal } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Mic, MicOff, Wand2, FileScan } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Switch } from '../ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { createSavingsGoalAction, parseDocumentAction } from '@/lib/actions';
import { useTranslation } from '@/contexts/translation-context';


const formSchema = z.object({
  title: z.string().min(3, 'Goal title must be at least 3 characters.'),
  targetAmount: z.coerce.number().min(1, 'Target amount must be greater than 0.'),
  deadline: z.date().optional(),
  isRoundupGoal: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

type AddSavingsGoalDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalToEdit?: SavingsGoal | null;
};

export function AddSavingsGoalDialog({ open, onOpenChange, goalToEdit }: AddSavingsGoalDialogProps) {
  const { addSavingsGoal, updateSavingsGoal, savingsGoals, showNotification, isPremium } = useAppContext();
  const { t } = useTranslation();
  
  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [userQuery, setUserQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      targetAmount: 0,
      deadline: undefined,
      isRoundupGoal: false,
    },
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          setUserQuery(prev => prev + finalTranscript);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                showNotification({ type: 'error', title: t('notifications.micDenied'), description: t('notifications.micDeniedDesc')});
            } else {
                showNotification({ type: 'error', title: t('notifications.speechError'), description: event.error });
            }
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [showNotification, t]);
  
  useEffect(() => {
      if(open) {
        if (goalToEdit) {
            form.reset({
                title: goalToEdit.title,
                targetAmount: goalToEdit.targetAmount,
                deadline: goalToEdit.deadline ? parseISO(goalToEdit.deadline) : undefined,
                isRoundupGoal: goalToEdit.isRoundupGoal || false,
            });
            setView('review');
        } else {
            setView('input');
            setUserQuery('');
            form.reset({ title: '', targetAmount: 0, deadline: undefined, isRoundupGoal: false });
        }
      }
  }, [open, goalToEdit, form]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        showNotification({ type: 'error', title: t('notifications.notSupported'), description: t('notifications.speechNotSupported') });
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserQuery('');
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setView('loading');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async (e) => {
        const photoDataUri = e.target?.result as string;
        const result = await parseDocumentAction({ photoDataUri });

        if ('error' in result) {
            showNotification({ type: 'error', title: 'OCR Failed', description: result.error });
            setView('input');
        } else {
            setUserQuery(result.text);
            setView('input');
        }
    };
  };

  const handleGenerateGoal = async () => {
    if (!userQuery) return;
    setView('loading');
    const result = await createSavingsGoalAction({ userQuery });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: t('notifications.aiError'), description: result.error });
        setView('input');
    } else {
        const deadlineDate = result.deadline ? parseISO(result.deadline) : undefined;
        form.reset({
            title: result.title,
            targetAmount: result.targetAmount,
            deadline: (deadlineDate && isValid(deadlineDate)) ? deadlineDate : undefined,
            isRoundupGoal: false, // Default this to false on AI creation
        });
        setView('review');
    }
  };


  const handleSaveGoal = async (values: FormData) => {
    const dataToSave = {
        ...values,
        deadline: values.deadline?.toISOString(),
    }
    const existingRoundupGoal = savingsGoals.find(g => g.isRoundupGoal && g.id !== goalToEdit?.id);
    if (values.isRoundupGoal && existingRoundupGoal) {
        showNotification({
            type: "error", title: t('notifications.roundupGoalExists'),
            description: t('notifications.roundupGoalExistsDesc', { title: existingRoundupGoal.title })
        });
        return;
    }

    if (goalToEdit) {
      await updateSavingsGoal(goalToEdit.id, dataToSave);
    } else {
      await addSavingsGoal(dataToSave);
    }
    onOpenChange(false);
  }
  
  const RoundupSwitch = (
    <FormField
        control={form.control}
        name="isRoundupGoal"
        render={({ field }) => (
        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
                <FormLabel className="text-base">{t('dialogs.addSavingsGoal.roundupLabel')}</FormLabel>
                <FormDescription>{t('dialogs.addSavingsGoal.roundupDescription')}</FormDescription>
            </div>
            <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isPremium} />
            </FormControl>
        </FormItem>
        )}
    />
  );
  
  const renderInputView = () => (
    <>
      <DialogDescription>
        {t('dialogs.addSavingsGoal.description')}
      </DialogDescription>
      <div className="space-y-4 pt-4">
          <div className="grid w-full gap-2">
              <Textarea placeholder={t('dialogs.addSavingsGoal.placeholder')} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={5} />
              <div className="flex gap-2">
                  <Button onClick={handleToggleRecording} variant={isRecording ? 'destructive' : 'outline'} className="flex-1">
                      {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                      {isRecording ? t('dialogs.buttons.stop') : t('dialogs.buttons.record')}
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                      <FileScan className="mr-2 h-4 w-4" />
                      {t('dialogs.buttons.scan')}
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
          </div>
          <DialogFooter>
              <Button onClick={handleGenerateGoal} disabled={!userQuery} className="w-full">
                  <Wand2 className="mr-2 h-4 w-4" /> {t('dialogs.buttons.generateGoalAI')}
              </Button>
          </DialogFooter>
      </div>
    </>
  );

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('dialogs.addSavingsGoal.loading')}</p>
    </div>
  );

  const renderReviewView = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSaveGoal)} className="space-y-6">
        <DialogDescription>{t('dialogs.addSavingsGoal.reviewDescription')}</DialogDescription>
        <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('dialogs.addSavingsGoal.titleLabel')}</FormLabel>
                    <FormControl><Input placeholder={t('dialogs.addSavingsGoal.titlePlaceholder')} {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>{t('dialogs.addSavingsGoal.targetAmountLabel')}</FormLabel>
                    <FormControl><Input type="number" placeholder="1000" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
             <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>{t('dialogs.addSavingsGoal.deadlineLabel')}</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={"outline"}
                                className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                                {field.value ? (format(field.value, "PPP")) : (<span>{t('dialogs.buttons.pickDate')}</span>)}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        {isPremium ? RoundupSwitch : (
          <TooltipProvider><Tooltip><TooltipTrigger asChild>{RoundupSwitch}</TooltipTrigger><TooltipContent><p>{t('tooltips.premiumRoundup')}</p></TooltipContent></Tooltip></TooltipProvider>
        )}
        <DialogFooter>
            {!goalToEdit && <Button type="button" variant="ghost" onClick={() => setView('input')}>{t('dialogs.buttons.back')}</Button>}
            <Button type="submit" disabled={form.formState.isSubmitting}>{goalToEdit ? t('dialogs.buttons.saveChanges') : t('dialogs.buttons.createGoal')}</Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ScrollArea className="max-h-[80vh] pr-6">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl">{goalToEdit ? t('dialogs.addSavingsGoal.editTitle') : t('dialogs.addSavingsGoal.addTitle')}</DialogTitle>
                <DialogDescription>
                  {t('dialogs.addSavingsGoal.description')}
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                {view === 'input' && renderInputView()}
                {view === 'loading' && renderLoadingView()}
                {view === 'review' && renderReviewView()}
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
