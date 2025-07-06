
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, MicOff, Loader2, Wand2, Trash2, FileScan, Sparkles, Lightbulb, Plus } from 'lucide-react';
import { createFinancialPlanAction, parseDocumentAction } from '@/lib/actions';
import type { FinancialPlan } from '@/types';
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
  const [userQuery, setUserQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null); // SpeechRecognition instance
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', items: [] },
  });
  const { fields, append, remove } = useFieldArray({
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
          setUserQuery(prev => prev + finalTranscript);
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
              setUserQuery(planToEdit.description || '');
              setView('review');
          } else {
              setView('input');
              setUserQuery('');
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
      setUserQuery(''); // Clear previous transcript
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
            setView('input'); // Go back to input view for user to confirm/edit text
        }
    };
  };

  const handleGeneratePlan = async () => {
    if (!userQuery) return;
    setView('loading');
    const result = await createFinancialPlanAction({ 
        userQuery: userQuery,
        existingPlan: planToEdit ? form.getValues() : undefined
    });
    
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
      description: userQuery,
      status: 'planning' as const,
      totalPredictedCost,
      totalActualCost: planToEdit?.totalActualCost || 0,
    };

    if (planToEdit) {
      await updateFinancialPlan(planToEdit.id, planData);
    } else {
      await addFinancialPlan(planData);
    }
    onOpenChange(false);
  };

  const renderInputView = () => (
    <>
      <DialogDescription>
        Describe your financial plan. You can type, use your voice, or scan a document. The AI will structure it into an itemized plan.
      </DialogDescription>
      <div className="space-y-4 pt-4">
          <div className="grid w-full gap-2">
              <Textarea placeholder="e.g., I'm planning a trip to Japan for two weeks. I think flights will be about $1500, hotels around $2000, and I'll budget $1000 for food and fun." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} />
              <div className="flex gap-2">
                  <Button onClick={handleToggleRecording} variant={isRecording ? 'destructive' : 'outline'} className="flex-1">
                      {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                      {isRecording ? 'Stop' : 'Record'}
                  </Button>
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                      <FileScan className="mr-2 h-4 w-4" />
                      Scan
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button onClick={() => setView('review')} variant="secondary" className="w-full sm:w-auto">Create Manually</Button>
              <Button onClick={handleGeneratePlan} disabled={!userQuery} className="w-full sm:w-auto">
                  <Wand2 className="mr-2 h-4 w-4" /> {planToEdit ? 'Update Plan with AI' : 'Generate Plan with AI'}
              </Button>
          </DialogFooter>
      </div>
    </>
  );

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is crafting your plan...</p>
    </div>
  )

  const renderReviewView = () => (
    <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-4">
        <DialogDescription>
          The AI has generated the following plan. Review the items and make any necessary changes before saving.
        </DialogDescription>
        <div className="space-y-2">
            <Label htmlFor="plan-title">Plan Title</Label>
            <Input id="plan-title" {...form.register('title')} />
            {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
        </div>
        <div className="space-y-2">
            <Label>Plan Items</Label>
            <ScrollArea className="max-h-60 pr-4">
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className={cn(
                            "flex items-start gap-2 rounded-md border p-3",
                            field.isAiSuggested && "border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10"
                        )}>
                            {field.isAiSuggested && <Lightbulb className="h-5 w-5 mt-5 text-amber-500 flex-shrink-0"/>}
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
            </ScrollArea>
             <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: nanoid(), description: '', category: 'Uncategorized', predictedCost: 0, actualCost: null, isAiSuggested: false })}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
            {form.formState.errors.items && <p className="text-sm text-destructive mt-2">There are errors in your plan items.</p>}
        </div>

        <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Want to add more?</AlertTitle>
            <AlertDescription>
                You can add more details to your original query and click "Update with AI" to refine the plan.
            </AlertDescription>
        </Alert>
        
        <Textarea 
            placeholder="Type here to add more details to your plan..." 
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
        />
        <Button variant="secondary" className="w-full" onClick={handleGeneratePlan} type="button">Update with AI</Button>

        <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setView('input')}>Back</Button>
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
