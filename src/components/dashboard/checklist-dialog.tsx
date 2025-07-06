
'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/app-context';
import { ScrollArea } from '../ui/scroll-area';
import { nanoid } from 'nanoid';
import { Plus, Trash2, Wand2, Mic, MicOff, FileScan, Loader2 } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createChecklistAction, parseDocumentAction } from '@/lib/actions';


const itemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description is required."),
  predictedCost: z.coerce.number().min(0, "Cost must be a positive number.").optional(),
  isCompleted: z.boolean(),
});

const formSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  items: z.array(itemSchema),
});

type FormData = z.infer<typeof formSchema>;

type ChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ChecklistDialog({ open, onOpenChange }: ChecklistDialogProps) {
  const { addChecklist, showNotification } = useAppContext();
  
  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [userQuery, setUserQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      items: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  useEffect(() => {
    if (open) {
      setView('input');
      setUserQuery('');
      form.reset({
        title: '',
        items: []
      });
    }
  }, [open, form]);

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
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          }
          setUserQuery(prev => prev + finalTranscript);
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error === 'not-allowed') showNotification({ type: 'error', title: 'Microphone Access Denied', description: "Please allow microphone access in your browser's site settings."});
            else showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
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
    if (isRecording) recognitionRef.current.stop();
    else {
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

  const handleGenerateChecklist = async () => {
    if (!userQuery) return;
    setView('loading');
    const result = await createChecklistAction({ userQuery });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        setView('input');
    } else {
        form.reset({
          title: result.title,
          items: result.items.map(item => ({ ...item, isCompleted: false, predictedCost: item.predictedCost || 0 }))
        });
        setView('review');
    }
  };

  async function onSubmit(values: FormData) {
    await addChecklist(values);
    onOpenChange(false);
  }

  const renderInputView = () => (
    <>
      <DialogDescription>
          Describe your checklist. You can type, use your voice, or scan a document. The AI will structure it for you.
      </DialogDescription>
      <div className="space-y-4 pt-4">
          <div className="grid w-full gap-2">
              <Textarea placeholder="e.g., Shopping list with milk, bread for $5, and eggs." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={5} />
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
              <Button onClick={handleGenerateChecklist} disabled={!userQuery} className="w-full sm:w-auto">
                  <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
              </Button>
          </DialogFooter>
      </div>
    </>
  );

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is building your checklist...</p>
    </div>
  );
  
  const renderReviewView = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogDescription>
            Review the details below. Add, edit, or remove items as needed before creating the checklist.
        </DialogDescription>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Checklist Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Monthly Shopping, Vacation Prep" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <Label>Items</Label>
          <ScrollArea className="max-h-60 w-full pr-4 mt-2">
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-2">
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl><Input placeholder="Item description" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.predictedCost`}
                    render={({ field }) => (
                      <FormItem className="w-28">
                        <FormControl><Input type="number" placeholder="Cost" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ id: nanoid(), description: '', predictedCost: 0, isCompleted: false })}>
            <Plus className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button type="button" variant="ghost" onClick={() => setView('input')}>Back to AI</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Create Checklist
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Financial Checklist</DialogTitle>
        </DialogHeader>
        {view === 'input' && renderInputView()}
        {view === 'loading' && renderLoadingView()}
        {view === 'review' && renderReviewView()}
      </DialogContent>
    </Dialog>
  );
}
