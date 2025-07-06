
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
import { Plus, Trash2, Wand2, Mic, MicOff, FileScan, Loader2, Keyboard, Camera, Upload, RotateCcw, SwitchCamera } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { createChecklistAction, parseDocumentAction } from '@/lib/actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Checklist, ChecklistTemplate } from '@/types';


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
  template?: ChecklistTemplate;
  checklistToEdit?: Checklist | null;
};

export function ChecklistDialog({ open, onOpenChange, template, checklistToEdit }: ChecklistDialogProps) {
  const { addChecklist, updateChecklist, showNotification } = useAppContext();
  
  const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
  const [activeTab, setActiveTab] = useState('text');
  const [userQuery, setUserQuery] = useState('');

  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Camera state
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
  
  const resetToInputView = () => {
    setView('input');
    setUserQuery('');
    setImageUri(null);
    if (isRecording) {
        recognitionRef.current?.stop();
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }

  useEffect(() => {
    if (open) {
      if (checklistToEdit) {
        form.reset({
          title: checklistToEdit.title,
          items: checklistToEdit.items.map(item => ({
            ...item,
            predictedCost: item.predictedCost || 0,
          })),
        });
        setView('review');
      } else if (template) {
        form.reset({
          title: template.title,
          items: template.items.map(item => ({
            ...item,
            predictedCost: item.predictedCost || 0,
            id: nanoid(),
            isCompleted: false,
          })),
        });
        setView('review');
      } else {
        resetToInputView();
        setActiveTab('text');
        form.reset({ title: '', items: [] });
      }
    } else {
      // Cleanup when dialog closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [open, template, checklistToEdit, form]);

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
            if (event.error === 'not-allowed') showNotification({ type: 'error', title: 'Microphone Access Denied'});
            else showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [showNotification]);
  
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

        if (cameras.length === 0) {
          setHasCameraPermission(false);
          return;
        }

        const backCam = cameras.find(d => d.label.toLowerCase().includes('back'));
        const deviceId = selectedDeviceId || backCam?.deviceId || cameras[0].deviceId;
        
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        setSelectedDeviceId(deviceId);
        setHasCameraPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeTab, view, selectedDeviceId]);


  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        showNotification({ type: 'error', title: 'Not Supported', description: "Speech recognition is not supported in your browser." });
        return;
    }
    if (isRecording) recognitionRef.current.stop();
    else {
      setUserQuery('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        handleAnalyze(dataUri);
    };
    reader.readAsDataURL(file);
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
    const result = await createChecklistAction({ userQuery: query });
    
    if ('error' in result) {
        showNotification({ type: 'error', title: 'AI Error', description: result.error });
        resetToInputView();
    } else {
        form.reset({
          title: result.title,
          items: result.items.map(item => ({ ...item, isCompleted: false, predictedCost: item.predictedCost || 0 }))
        });
        setView('review');
    }
  };

  async function onSubmit(values: FormData) {
    if (checklistToEdit) {
      await updateChecklist(checklistToEdit.id, values);
    } else {
      await addChecklist(values);
    }
    onOpenChange(false);
  }
  
  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIndex].deviceId);
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

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is building your checklist...</p>
    </div>
  );
  
  const renderReviewForm = ({ isReviewMode }: { isReviewMode: boolean }) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
        <DialogDescription>
            {isReviewMode
                ? "The AI has generated the following checklist. Review and make any changes."
                : "Manually add a title and items to create your checklist."
            }
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
          {isReviewMode && !template && !checklistToEdit && <Button type="button" variant="ghost" onClick={resetToInputView}>Back</Button>}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {checklistToEdit ? 'Save Changes' : 'Create Checklist'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  const renderContent = () => {
    if (checklistToEdit || view === 'review') {
      return renderReviewForm({ isReviewMode: true });
    }
    
    if (view === 'loading') {
      return renderLoadingView();
    }

    return (
        <Tabs defaultValue="text" value={activeTab} className="w-full pt-4" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
                <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> Text</TabsTrigger>
                <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> Voice</TabsTrigger>
                <TabsTrigger value="camera" className="flex-col h-14"><Camera className="mb-1" /> Camera</TabsTrigger>
                <TabsTrigger value="upload" className="flex-col h-14"><Upload className="mb-1" /> Upload</TabsTrigger>
                <TabsTrigger value="manual" className="flex-col h-14"><Plus className="mb-1" /> Manual</TabsTrigger>
            </TabsList>
            
            <TabsContent value="text" className="pt-4 space-y-4">
                <DialogDescription>Describe your checklist. The AI will structure it into an itemized list.</DialogDescription>
                <Textarea placeholder="e.g., Shopping list for milk, bread for $5, and eggs" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} />
                <DialogFooter>
                    <Button onClick={() => handleGenerateChecklist(userQuery)} disabled={!userQuery}>
                        <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
                    </Button>
                </DialogFooter>
            </TabsContent>

            <TabsContent value="voice" className="pt-4 space-y-4 flex flex-col items-center justify-center">
                <DialogDescription>Start speaking and the AI will transcribe and create your checklist.</DialogDescription>
                <Button onClick={handleToggleRecording} size="icon" className={cn("h-20 w-20 rounded-full my-4", isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse')}>
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <p className="text-muted-foreground h-6">{isRecording ? "Listening..." : "Press to start recording"}</p>
            </TabsContent>

            <TabsContent value="camera" className="pt-4 space-y-4">
                <DialogDescription>Position a document in the frame and capture an image to scan it.</DialogDescription>
                <div className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden rounded-lg">
                    <canvas ref={canvasRef} className="hidden" />
                    {imageUri ? (
                        <Image src={imageUri} alt="Document preview" fill objectFit="contain" />
                    ) : (
                        <>
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                            {hasCameraPermission === false && <p className="absolute text-destructive-foreground bg-destructive/80 p-2 rounded-md">Camera Access Denied</p>}
                        </>
                    )}
                    {videoDevices.length > 1 && !imageUri && (
                        <Button type="button" onClick={handleSwitchCamera} variant="outline" size="icon" className="absolute bottom-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white border-white/50">
                            <SwitchCamera className="h-5 w-5" />
                        </Button>
                    )}
                </div>
                {imageUri ? (
                    <div className="grid grid-cols-2 gap-4">
                        <Button onClick={() => setImageUri(null)} variant="outline"><RotateCcw className="mr-2 h-4 w-4" />Retake</Button>
                        <Button onClick={() => handleAnalyze()}><Wand2 className="mr-2 h-4 w-4" />Analyze</Button>
                    </div>
                ) : (
                    <Button onClick={handleCapture} disabled={hasCameraPermission !== true} className="w-full"><Camera className="mr-2 h-4 w-4" />Capture Photo</Button>
                )}
            </TabsContent>

            <TabsContent value="upload" className="pt-4 flex flex-col items-center justify-center space-y-4">
                <DialogDescription>Upload an image of a document, like a shopping list.</DialogDescription>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                    <Upload className="mr-2 h-4 w-4" /> Choose File
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </TabsContent>

            <TabsContent value="manual" className="pt-0">
               {renderReviewForm({ isReviewMode: false })}
            </TabsContent>
        </Tabs>
    )
  }

  const dialogTitle = checklistToEdit ? "Edit Checklist" : "New Financial Checklist";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
