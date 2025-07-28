

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { useAppContext } from '@/contexts/app-context';
import type { Checklist } from '@/types';
import { Plus, Trash2, Wand2, Mic, MicOff, Camera, Upload, Keyboard, RotateCcw, SwitchCamera, Loader2, FileScan } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { nanoid } from 'nanoid';
import { allIcons } from '@/data/icons';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';
import Image from 'next/image';
import { Alert } from '../ui/alert';
import { createChecklistAction, parseDocumentAction } from '@/lib/actions';

const checklistItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, 'Description is required.'),
  isCompleted: z.boolean(),
  predictedCost: z.coerce.number().min(0, 'Cost must be positive.'),
  category: z.string().min(1, 'Category is required.'),
});

const formSchema = z.object({
  title: z.string().min(2, 'Title is required.'),
  iconName: z.string().min(1, 'Icon is required.'),
  items: z.array(checklistItemSchema).min(1, 'Add at least one item.'),
});

type FormData = z.infer<typeof formSchema>;

type ChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checklistToEdit?: Checklist | null;
};

export function ChecklistDialog({ open, onOpenChange, checklistToEdit }: ChecklistDialogProps) {
  const { addChecklist, updateChecklist, expenseCategories, showNotification } = useAppContext();
  
  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [activeTab, setActiveTab] = useState('text');
  const [userQuery, setUserQuery] = useState('');
  
  // Input states
  const [isRecording, setIsRecording] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      iconName: 'ShoppingCart',
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  const resetToInputView = () => {
    setView('input');
    setUserQuery('');
    setImageUri(null);
    if (isRecording) recognitionRef.current?.stop();
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    form.reset({ title: '', iconName: 'ShoppingCart', items: [] });
  }

  useEffect(() => {
    if (open) {
      if (checklistToEdit) {
        form.reset({
            ...checklistToEdit,
            items: checklistToEdit.items.map(i => ({...i, isCompleted: i.isCompleted || false}))
        });
        setView('review');
        setActiveTab('manual');
      } else {
        resetToInputView();
        setActiveTab('text');
      }
    } else {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }
  }, [open, checklistToEdit, form]);
  
  // --- AI & Input Handling ---
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
              handleGenerateChecklist(finalTranscript);
          }
        };
        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [showNotification]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserQuery('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleAnalyze = async (dataUri?: string) => {
    const finalImageUri = dataUri || imageUri;
    if (!finalImageUri) return;

    setView('loading');
    const result = await parseDocumentAction({ photoDataUri: finalImageUri });
    if ('error' in result) {
        showNotification({ type: 'error', title: 'Document Scan Failed', description: result.error });
        resetToInputView();
    } else {
        handleGenerateChecklist(result.text);
    }
  };

  const handleGenerateChecklist = async (query: string) => {
    if (!query) return;
    setView('loading');
    setUserQuery(query);
    const result = await createChecklistAction({
        userQuery,
        availableIcons: Object.keys(allIcons),
        availableCategories: expenseCategories,
    });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        resetToInputView();
    } else {
        replace(result.items.map(item => ({...item, isCompleted: false})));
        form.setValue('title', result.title);
        form.setValue('iconName', result.iconName);
        setView('review');
        setActiveTab('manual');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => handleAnalyze(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        setImageUri(canvas.toDataURL('image/jpeg'));
    }
  };

  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIndex].deviceId);
  };

  // Camera stream effect
  useEffect(() => {
    if (activeTab !== 'camera' || view !== 'input') {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        return;
    }

    const startCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        setVideoDevices(cameras);
        if (cameras.length === 0) throw new Error("No camera found");
        const deviceId = selectedDeviceId || cameras.find(d => d.label.toLowerCase().includes('back'))?.deviceId || cameras[0].deviceId;
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setSelectedDeviceId(deviceId);
        setHasCameraPermission(true);
      } catch (error) {
        setHasCameraPermission(false);
      }
    };
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  }, [activeTab, view, selectedDeviceId]);


  async function onSubmit(values: FormData) {
    if (checklistToEdit) {
      await updateChecklist(checklistToEdit.id, values);
    } else {
      await addChecklist(values);
    }
    onOpenChange(false);
  }
  
  // --- UI Components ---

  const IconPicker = ({ field }: { field: any }) => {
    const SelectedIcon = allIcons[field.value] || allIcons['ShoppingCart'];
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                    <SelectedIcon /> {field.value}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 h-96">
                <ScrollArea className="h-full">
                    <div className="grid grid-cols-5 gap-1">
                        {Object.entries(allIcons).map(([name, Icon]) => (
                            <Button key={name} variant="ghost" size="icon" onClick={() => field.onChange(name)}>
                                <Icon />
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
  }

  const renderReviewForm = ({ isReviewMode }: { isReviewMode: boolean }) => (
    <div className="pt-4 h-full flex flex-col">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 flex flex-col h-full">
          <DialogDescription>
              {isReviewMode
                ? "The AI has generated the following checklist. Review and make any necessary changes before saving."
                : "Manually add a title, icon, and items to create your checklist."
              }
            </DialogDescription>
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem className="col-span-2"><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. Monthly Bills" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="iconName" render={({ field }) => (
                <FormItem><FormLabel>Icon</FormLabel><IconPicker field={field} /><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-2 flex-1 min-h-0">
                <Label>Items</Label>
                <ScrollArea className="h-full pr-4">
                    <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                <FormField control={form.control} name={`items.${index}.description`} render={({ field }) => (
                                    <FormItem className="col-span-4"><FormLabel className="text-xs">Item</FormLabel><FormControl><Input placeholder="e.g., Rent" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`items.${index}.predictedCost`} render={({ field }) => (
                                    <FormItem className="col-span-3"><FormLabel className="text-xs">Cost</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name={`items.${index}.category`} render={({ field }) => (
                                    <FormItem className="col-span-4"><FormLabel className="text-xs">Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent><SelectContent>
                                                {expenseCategories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                                ))}
                                            </SelectContent></SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ id: nanoid(), description: '', isCompleted: false, predictedCost: 0, category: '' })}>
                    <Plus className="mr-2 h-4 w-4" />Add Item
                </Button>
            </div>
            
            <DialogFooter>
              {isReviewMode && <Button type="button" variant="ghost" onClick={resetToInputView}>Back</Button>}
              <Button type="submit">{checklistToEdit ? 'Save Changes' : 'Create Checklist'}</Button>
            </DialogFooter>
          </form>
        </Form>
    </div>
  );

  const renderContent = () => {
    if (view === 'loading') return <div className="flex flex-col items-center justify-center space-y-4 h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">AI is crafting your checklist...</p></div>;
    if (view === 'review') return renderReviewForm({ isReviewMode: true });

    return (
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value === 'manual' && view === 'input' && fields.length === 0) {
            replace([{ id: nanoid(), description: '', isCompleted: false, predictedCost: 0, category: '' }]);
            setView('review');
        }
      }} className="w-full h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> Text</TabsTrigger>
            <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> Voice</TabsTrigger>
            <TabsTrigger value="camera" className="flex-col h-14"><Camera className="mb-1" /> Camera</TabsTrigger>
            <TabsTrigger value="upload" className="flex-col h-14"><Upload className="mb-1" /> Upload</TabsTrigger>
            <TabsTrigger value="manual" className="flex-col h-14"><Plus className="mb-1" /> Manual</TabsTrigger>
        </TabsList>
        <div className="pt-4 flex-1 min-h-0">
          <TabsContent value="text" className="h-full">
              <div className="h-full flex flex-col space-y-4">
                  <DialogDescription>Describe your checklist. The AI will structure it for you.</DialogDescription>
                  <Textarea placeholder="e.g., Weekly grocery run for milk, bread, and eggs for about $75" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} className="flex-1"/>
                  <DialogFooter>
                      <Button onClick={() => handleGenerateChecklist(userQuery)} disabled={!userQuery}><Wand2 className="mr-2 h-4 w-4" /> Generate with AI</Button>
                  </DialogFooter>
              </div>
          </TabsContent>
          <TabsContent value="voice" className="h-full flex flex-col items-center justify-center space-y-4">
              <DialogDescription>Press the button and start speaking.</DialogDescription>
                <Button onClick={handleToggleRecording} size="icon" className={`h-20 w-20 rounded-full my-4 ${isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse'}`}>
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <p className="text-muted-foreground h-6">{isRecording ? "Listening..." : "Press to start"}</p>
          </TabsContent>
           <TabsContent value="camera" className="pt-4 space-y-4">
                <DialogDescription>Position a document or list in the frame and capture an image to scan it.</DialogDescription>
                <div className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden rounded-lg">
                    <canvas ref={canvasRef} className="hidden" />
                    {imageUri ? <Image src={imageUri} alt="Checklist preview" fill objectFit="contain" /> : <><video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />{hasCameraPermission === false && <Alert variant="destructive" className="absolute w-11/12"><Camera className="h-4 w-4" />Camera Access Denied</Alert>}</>}
                    {videoDevices.length > 1 && !imageUri && <Button type="button" onClick={handleSwitchCamera} variant="outline" size="icon" className="absolute bottom-2 right-2 z-10"><SwitchCamera className="h-5 w-5" /></Button>}
                </div>
                {imageUri ? (<div className="grid grid-cols-2 gap-4"><Button onClick={() => setImageUri(null)} variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Retake</Button><Button onClick={() => handleAnalyze()}><Wand2 className="mr-2 h-4 w-4" />Analyze</Button></div>) : (<Button onClick={handleCapture} disabled={hasCameraPermission === false} className="w-full"><Camera className="mr-2 h-4 w-4" />Capture</Button>)}
            </TabsContent>
            <TabsContent value="upload" className="pt-4 h-full">
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <DialogDescription>Upload an image of a document or shopping list.</DialogDescription>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm"><FileScan className="mr-2 h-4 w-4" />Choose File</Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                </div>
            </TabsContent>
          <TabsContent value="manual" className="h-full">{renderReviewForm({ isReviewMode: false })}</TabsContent>
        </div>
      </Tabs>
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col h-[90vh]">
        <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-headline text-2xl">{checklistToEdit ? 'Edit Checklist' : 'New Checklist'}</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 min-h-0">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
