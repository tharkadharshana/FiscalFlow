
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
import { Mic, MicOff, Loader2, Wand2, Trash2, FileScan } from 'lucide-react';
import { createMonthlyBudgetsAction } from '@/lib/actions';
import { useAppContext } from '@/contexts/app-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Budget, BudgetItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

type CreateMonthlyBudgetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToEdit?: Budget | null;
};

const budgetItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description can't be empty."),
  predictedCost: z.coerce.number().optional(),
});

const singleBudgetSchema = z.object({
  category: z.string().min(1, "Category can't be empty."),
  limit: z.coerce.number().min(0, 'Limit must be a positive number.'),
  items: z.array(budgetItemSchema).optional(),
});

const formSchema = z.object({
  budgets: z.array(singleBudgetSchema),
});

type FormData = z.infer<typeof formSchema>;

export function CreateMonthlyBudgetsDialog({ open, onOpenChange, budgetToEdit }: CreateMonthlyBudgetsDialogProps) {
  const { addBudget, updateBudget, budgets: existingBudgets, showNotification, expenseCategories } = useAppContext();

  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { budgets: [] },
  });

  const { fields, remove } = useFieldArray({
    control: form.control,
    name: 'budgets',
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
      if(open) {
        if (budgetToEdit) {
            form.reset({ budgets: [{
                category: budgetToEdit.category,
                limit: budgetToEdit.limit,
                items: budgetToEdit.items || []
            }]});
            setView('review');
        } else {
            setView('input');
            setTranscript('');
            form.reset({ budgets: [] });
        }
      }
  }, [open, budgetToEdit, form]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        showNotification({ type: 'error', title: 'Not Supported', description: "Speech recognition is not supported in your browser." });
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  const handleGenerateBudgets = async () => {
    if (!transcript) return;
    setView('loading');
    const existingBudgetCategories = existingBudgets.map(b => b.category);
    const result = await createMonthlyBudgetsAction({ userQuery: transcript, existingCategories: existingBudgetCategories });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        setView('input');
    } else {
        form.setValue('budgets', result.budgets);
        setView('review');
    }
  };

  const handleSaveBudgets = async (data: FormData) => {
    let count = 0;
    for (const budget of data.budgets) {
        if (budgetToEdit) {
            await updateBudget(budgetToEdit.id, budget);
        } else {
            await addBudget({...budget, userInput: transcript });
        }
        count++;
    }
    if (count > 0) {
      showNotification({
        type: 'success',
        title: budgetToEdit ? 'Budget Updated' : `${count} Budget(s) Created`,
        description: budgetToEdit ? `Your budget for ${data.budgets[0].category} has been updated.` : 'Your monthly budgets have been set.',
    });
    }
    onOpenChange(false);
  };

  const renderInputView = () => (
    <div className="space-y-4">
        <DialogDescription>
            Use your voice or text to set your monthly budgets. For example: "Set a budget of $500 for Groceries to buy milk, bread, and eggs."
        </DialogDescription>
        <Tabs defaultValue="voice">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="voice"><Mic className="mr-2 h-4 w-4"/> Use Voice</TabsTrigger>
                <TabsTrigger value="ocr" disabled><FileScan className="mr-2 h-4 w-4"/> Scan Document</TabsTrigger>
            </TabsList>
            <TabsContent value="voice" className="pt-4">
                <div className="grid w-full gap-2">
                    <Textarea placeholder="Your budget description will appear here..." value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} />
                    <Button onClick={handleToggleRecording} variant={isRecording ? 'destructive' : 'outline'}>
                        {isRecording ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {isRecording ? 'Stop Recording' : 'Start Recording'}
                    </Button>
                </div>
            </TabsContent>
        </Tabs>
        <DialogFooter>
            <Button onClick={handleGenerateBudgets} disabled={!transcript} className="w-full">
                <Wand2 className="mr-2 h-4 w-4" /> Generate Budgets with AI
            </Button>
        </DialogFooter>
    </div>
  );

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is crafting your budgets...</p>
    </div>
  )

  const renderReviewView = () => (
    <form onSubmit={form.handleSubmit(handleSaveBudgets)} className="space-y-4">
        <DialogDescription>
            The AI has generated the following budgets. Review them and make any necessary changes before saving.
        </DialogDescription>
        <div className="space-y-3">
            {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-end gap-2">
                        <div className="flex-1 grid grid-cols-5 gap-x-3 gap-y-1">
                            <div className="col-span-3">
                               <Label className="text-xs text-muted-foreground">Category</Label>
                               <Controller
                                 control={form.control}
                                 name={`budgets.${index}.category`}
                                 render={({ field }) => (
                                   <Select onValueChange={field.onChange} value={field.value} disabled={!!budgetToEdit}>
                                     <SelectTrigger className="h-8">
                                       <SelectValue placeholder="Select category" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       {expenseCategories.map(cat => (
                                         <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                 )}
                               />
                            </div>
                            <div className="col-span-2">
                               <Label className="text-xs text-muted-foreground">Monthly Limit ($)</Label>
                               <Input {...form.register(`budgets.${index}.limit`)} type="number" className="h-8"/>
                            </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(index)} disabled={!!budgetToEdit}>
                            <Trash2 className="h-4 w-4 text-muted-foreground"/>
                        </Button>
                    </div>
                    {/* Itemized list would go here if needed in review */}
                </div>
            ))}
            {fields.length === 0 && (
                <p className="text-center text-muted-foreground py-4">The AI didn't find any new budgets to create based on your request, or they already exist.</p>
            )}
        </div>
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setView('input')}>Back to Input</Button>
            <Button type="submit" disabled={form.formState.isSubmitting || fields.length === 0}>Save Budgets</Button>
        </DialogFooter>
    </form>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <ScrollArea className="max-h-[80vh] pr-6">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl">{budgetToEdit ? 'Edit Budget' : 'Create Monthly Budgets'}</DialogTitle>
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
