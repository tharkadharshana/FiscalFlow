'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, FormProvider, useFormContext } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Mic, MicOff, Loader2, Wand2, Keyboard, Plus, Trash2, Lightbulb } from 'lucide-react';
import { createMonthlyBudgetsAction } from '@/lib/actions';
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Budget, BudgetItem } from '@/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { nanoid } from 'nanoid';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '../ui/label';

// --------- Zod Schemas ---------
const budgetItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description can't be empty."),
  predictedCost: z.coerce.number().optional(),
});

const singleBudgetSchema = z.object({
  id: z.string(),
  category: z.string({ required_error: 'Please select a category.' }).min(1, "Category can't be empty."),
  limit: z.coerce.number().min(0.01, 'Limit must be greater than 0.'),
  items: z.array(budgetItemSchema).optional(),
});

const formSchema = z.object({
  budgets: z.array(singleBudgetSchema),
});

type FormData = z.infer<typeof formSchema>;


// --- Helper Component for Checklist Items ---
const BudgetItemsFieldArray = ({ budgetIndex }: { budgetIndex: number }) => {
    const { control, register } = useFormContext<FormData>();
    const { fields, append, remove } = useFieldArray({
      control,
      name: `budgets.${budgetIndex}.items`,
    });

    return (
        <div className="space-y-2 mt-2">
            <Label className="text-xs text-muted-foreground">Checklist Items (Optional)</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-2">
                <div className="space-y-2">
                    {fields.map((item, itemIndex) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <Input {...register(`budgets.${budgetIndex}.items.${itemIndex}.description`)} placeholder="e.g. Milk, Bread" className="h-8"/>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(itemIndex)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({id: nanoid(), description: '', predictedCost: 0})}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
        </div>
    );
};


// --------- Main Dialog Component ---------
type AddBudgetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToEdit?: Budget | null;
};

export function AddBudgetDialog({ open, onOpenChange, budgetToEdit }: AddBudgetDialogProps) {
  const { userProfile, budgets: existingBudgets, showNotification, addBudget, updateBudget, expenseCategories } = useAppContext();

  type View = 'input' | 'loading' | 'review';
  const [view, setView] = useState<View>('input');
  const [activeTab, setActiveTab] = useState('text');
  const [userQuery, setUserQuery] = useState('');
  
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { budgets: [] },
  });

  const { fields, remove, append, replace, control } = useFieldArray({
    control: form.control,
    name: 'budgets',
  });

  const resetToInputView = () => {
    setView('input');
    setUserQuery('');
    if (isRecording) recognitionRef.current?.stop();
    form.reset({ budgets: [] });
  }

  useEffect(() => {
    if (open) {
        if (budgetToEdit) {
            replace([{
                id: budgetToEdit.id,
                category: budgetToEdit.category,
                limit: budgetToEdit.limit,
                items: budgetToEdit.items || []
            }]);
            setView('review');
            setActiveTab('manual');
        } else {
            resetToInputView();
            setActiveTab('text');
        }
    }
  }, [open, budgetToEdit, replace]);
  
  const handleSaveBudgets = async (data: FormData) => {
    let count = 0;
    for (const budget of data.budgets) {
        const dataToSave = { ...budget, userInput: userQuery || '' };
        if (budgetToEdit) {
            await updateBudget(budgetToEdit.id, dataToSave);
        } else {
            await addBudget(dataToSave);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          }
          if (finalTranscript) {
              setUserQuery(finalTranscript);
              handleGenerateBudgets(finalTranscript);
          }
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') {
                showNotification({ type: 'error', title: 'Microphone Access Denied' });
            } else {
                showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
            }
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [showNotification]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        showNotification({ type: 'error', title: 'Not Supported', description: "Speech recognition is not supported in your browser." });
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserQuery('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleGenerateBudgets = async (query: string) => {
    if (!query) return;
    setView('loading');
    setUserQuery(query);
    const existingBudgetCategories = existingBudgets.map(b => b.category);
    const result = await createMonthlyBudgetsAction({ userQuery: query, existingCategories: existingBudgetCategories });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        resetToInputView();
    } else {
        replace(result.budgets.map(b => ({...b, id: nanoid() })));
        setView('review');
        setActiveTab('manual');
    }
  };
  
  const renderReviewForm = ({ isReviewMode }: { isReviewMode: boolean }) => (
    <div className="pt-4 h-full flex flex-col">
        <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSaveBudgets)} className="flex flex-col h-full">
                <DialogDescription>
                    {isReviewMode
                        ? "The AI has generated the following budgets. Review them and make any necessary changes before saving."
                        : "Manually add a budget for a category, and optionally add checklist items to it."
                    }
                </DialogDescription>
                <div className="flex-1 min-h-0 py-4">
                    <ScrollArea className="h-full pr-4">
                        <div className="space-y-3 pb-4">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex flex-col gap-2 rounded-md border p-3">
                                <div className="flex items-start gap-2">
                                    <div className="flex-1 space-y-2">
                                        <div className="grid grid-cols-5 gap-x-3">
                                            <FormField
                                                control={form.control}
                                                name={`budgets.${index}.category`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-3">
                                                        <FormLabel className="text-xs text-muted-foreground">Category</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value} disabled={!!budgetToEdit}>
                                                            <FormControl>
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue placeholder="Select category" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {expenseCategories.map(cat => (
                                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`budgets.${index}.limit`}
                                                render={({ field }) => (
                                                    <FormItem className="col-span-2">
                                                        <FormLabel className="text-xs text-muted-foreground">Monthly Limit ({userProfile?.currencyPreference || '$'})</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} type="number" className="h-8" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                        <BudgetItemsFieldArray budgetIndex={index} />
                                    </div>
                                    {!budgetToEdit && (
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-muted-foreground"/>
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {(fields.length === 0 && isReviewMode) && (
                            <Alert>
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle>No New Budgets Found</AlertTitle>
                                <AlertDescription>
                                    The AI didn't find any new budgets to create from your request. This could be because they already exist. You can still add one manually.
                                </AlertDescription>
                            </Alert>
                        )}
                        {!budgetToEdit && (
                            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ id: nanoid(), category: '', limit: 0, items: [] })}>
                                <Plus className="mr-2 h-4 w-4" /> Add Another Budget
                            </Button>
                        )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                {isReviewMode && !budgetToEdit && <Button type="button" variant="ghost" onClick={resetToInputView}>Back to Generator</Button>}
                <Button type="submit" disabled={form.formState.isSubmitting || fields.length === 0}>Save Budgets</Button>
                </DialogFooter>
            </form>
        </FormProvider>
    </div>
  );

  const renderContent = () => {
    if (view === 'loading') return <div className="flex flex-col items-center justify-center space-y-4 h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">AI is crafting your budgets...</p></div>;
    if (view === 'review') return renderReviewForm({ isReviewMode: true });

    // Otherwise, view is 'input', so show the Tabs
    return (
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value === 'manual' && view === 'input' && fields.length === 0) {
            replace([{ id: nanoid(), category: '', limit: 0, items: [] }]);
            setView('review'); // Switch to review view for manual entry
        }
      }} className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> AI Text</TabsTrigger>
          <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> AI Voice</TabsTrigger>
          <TabsTrigger value="manual" className="flex-col h-14"><Plus className="mb-1" /> Manual</TabsTrigger>
        </TabsList>
        <div className="pt-4 flex-1 min-h-0">
          <TabsContent value="text" className="h-full">
              <div className="h-full flex flex-col space-y-4">
                  <DialogDescription>Describe your monthly budgets. The AI will structure them for you.</DialogDescription>
                  <Textarea placeholder={`e.g., Budget ${userProfile?.currencyPreference || '$'}500 for Groceries to buy milk and bread. Also, ${userProfile?.currencyPreference || '$'}150 for transportation...`} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} className="flex-1"/>
                  <DialogFooter>
                      <Button onClick={() => handleGenerateBudgets(userQuery)} disabled={!userQuery}>
                          <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
                      </Button>
                  </DialogFooter>
              </div>
          </TabsContent>
          <TabsContent value="voice" className="h-full flex flex-col items-center justify-center space-y-4">
              <DialogDescription>Press the button and start speaking to create your budgets.</DialogDescription>
                <Button onClick={handleToggleRecording} size="icon" className={`h-20 w-20 rounded-full my-4 ${isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse'}`}>
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <p className="text-muted-foreground h-6">{isRecording ? "Listening..." : "Press to start recording"}</p>
          </TabsContent>
          <TabsContent value="manual" className="h-full">
              {renderReviewForm({ isReviewMode: false })}
          </TabsContent>
        </div>
      </Tabs>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-headline text-2xl">{budgetToEdit ? 'Edit Budget' : 'Add Budgets'}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 min-h-0">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}