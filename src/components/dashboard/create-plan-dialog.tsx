
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Loader2, Wand2, Trash2, FileScan, Sparkles, Lightbulb } from 'lucide-react';
import { createFinancialPlanAction } from '@/lib/actions';
import type { FinancialPlan, PlanItem } from '@/types';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';

type CreatePlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planToEdit?: FinancialPlan | null;
};

const planItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description can't be empty."),
  category: z.string(),
  predictedCost: z.coerce.number().min(0, 'Cost must be a positive number.'),
  actualCost: z.number().nullable(),
  isAiSuggested: z.boolean().optional(),
});

const formSchema = z.object({
  title: z.string().min(3, 'Plan title must be at least 3 characters.'),
  items: z.array(planItemSchema),
});

type FormData = z.infer<typeof formSchema>;

export function CreatePlanDialog({ open, onOpenChange, planToEdit }: CreatePlanDialogProps) {
  const { addFinancialPlan, updateFinancialPlan, showNotification } = useAppContext();

  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null); // SpeechRecognition instance

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', items: [] },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  useEffect(() => {
    // Initialize SpeechRecognition
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
          setTranscript(prev => prev + finalTranscript);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                showNotification({
                    type: 'error',
                    title: 'Microphone Access Denied',
                    description: "Please allow microphone access in your browser's site settings to use this feature."
                });
            } else {
                showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
            }
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => {
            setIsRecording(false);
        }
      }
    }
  }, [showNotification]);
  
  useEffect(() => {
      // Reset state when dialog opens or planToEdit changes
      if(open) {
          if (planToEdit) {
              form.reset({
                  title: planToEdit.title,
                  items: planToEdit.items.map(item => ({...item, actualCost: item.actualCost ?? null}))
              });
              setView('review');
          } else {
              setView('input');
              setTranscript('');
              form.reset({ title: '', items: [] });
          }
      }
  }, [open, planToEdit, form]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        showNotification({ type: 'error', title: 'Not Supported', description: "Speech recognition is not supported in your browser." });
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript(''); // Clear previous transcript
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const handleGeneratePlan = async () => {
    if (!transcript) return;
    setView('loading');
    const result = await createFinancialPlanAction({ userQuery: transcript });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        setView('input');
    } else {
        form.reset({
            title: result.title,
            items: result.items.map(item => ({...item, actualCost: null}))
        });
        setView('review');
    }
  };

  const handleSavePlan = async (data: FormData) => {
    const totalPredictedCost = data.items.reduce((sum, item) => sum + item.predictedCost, 0);
    const planData = {
      ...data,
      status: 'planning' as const,
      totalPredictedCost,
      totalActualCost: 0, // Will be calculated later
    };

    if (planToEdit) {
      await updateFinancialPlan(planToEdit.id, planData);
    } else {
      await addFinancialPlan(planData);
    }
    onOpenChange(false);
  };

  const renderInputView = () => (
    <div className="space-y-4">
        <DialogDescription>
            Use your voice to describe your financial plan. For example: "I'm planning a trip to Japan for two weeks. I think flights will be about $1500, hotels around $2000, and I'll budget $1000 for food and fun."
        </DialogDescription>
        <Tabs defaultValue="voice">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="voice"><Mic className="mr-2 h-4 w-4"/> Use Voice</TabsTrigger>
                <TabsTrigger value="ocr" disabled><FileScan className="mr-2 h-4 w-4"/> Scan Document</TabsTrigger>
            </TabsList>
            <TabsContent value="voice" className="pt-4">
                <div className="grid w-full gap-2">
                    <Textarea placeholder="Your plan description will appear here..." value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} />
                    <Button onClick={handleToggleRecording} variant={isRecording ? 'destructive' : 'outline'}>
                        {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                </div>
            </TabsContent>
        </Tabs>
        <DialogFooter>
            <Button onClick={handleGeneratePlan} disabled={!transcript} className="w-full">
                <Wand2 className="mr-2 h-4 w-4" /> Generate Plan with AI
            </Button>
        </DialogFooter>
    </div>
  );

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is crafting your plan...</p>
    </div>
  )

  const renderReviewView = () => (
    <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-4">
        <div className="space-y-2">
            <Label htmlFor="plan-title">Plan Title</Label>
            <Input id="plan-title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-2">
            <Label>Plan Items</Label>
            <div className="space-y-3">
                {fields.map((field, index) => (
                    <div key={field.id} className={cn(
                        "flex items-start gap-2 rounded-md border p-3",
                        field.isAiSuggested && "border-amber-400/50 bg-amber-50/50"
                    )}>
                        {field.isAiSuggested && <Lightbulb className="h-5 w-5 mt-1.5 text-amber-500 flex-shrink-0"/>}
                        <div className="flex-1 grid grid-cols-5 gap-x-3 gap-y-1">
                            <div className="col-span-3">
                               <Label className="text-xs text-muted-foreground">Description</Label>
                               <Input {...form.register(`items.${index}.description`)} className="h-8"/>
                            </div>
                            <div className="col-span-2">
                               <Label className="text-xs text-muted-foreground">Predicted Cost ($)</Label>
                               <Input {...form.register(`items.${index}.predictedCost`)} type="number" className="h-8"/>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 mt-4" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                    </div>
                ))}
            </div>
            {form.formState.errors.items && <p className="text-sm text-destructive mt-2">There are errors in your plan items.</p>}
        </div>

        <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>What's next?</AlertTitle>
            <AlertDescription>
                You can add more items by typing below and clicking "Update with AI", or save the plan as is.
            </AlertDescription>
        </Alert>

        {/* Future feature: Add more with AI */}
        {/* <Textarea placeholder="Type here to add more details to your plan..." />
        <Button variant="secondary" className="w-full">Update with AI</Button> */}

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setView('input')}>Back to Input</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>Save Plan</Button>
        </DialogFooter>
    </form>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <ScrollArea className="max-h-[80vh] pr-6">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl">{planToEdit ? 'Edit Financial Plan' : 'Create a New Financial Plan'}</DialogTitle>
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
