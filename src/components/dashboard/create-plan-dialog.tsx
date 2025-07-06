
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Mic, Loader2, Wand2, Trash2, Sparkles, Lightbulb, Plus, Keyboard, Upload, Camera, SwitchCamera, RotateCcw, MicOff } from 'lucide-react';
import { createFinancialPlanAction, parseDocumentAction } from '@/lib/actions';
import type { FinancialPlan } from '@/types';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import Image from 'next/image';


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

    const [view, setView] = useState<'selection' | 'typing' | 'voice' | 'camera' | 'loading' | 'review'>('selection');
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
      defaultValues: { title: '', items: [] },
    });
    const { fields, append, remove } = useFieldArray({
      control: form.control,
      name: 'items',
    });

    const resetToSelection = () => {
        setView('selection');
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
  
    // Effect to reset state when dialog opens or planToEdit changes
    useEffect(() => {
        if(open) {
            if (planToEdit) {
                form.reset({
                    title: planToEdit.title,
                    items: planToEdit.items.map(item => ({...item, actualCost: item.actualCost ?? null}))
                });
                setUserQuery(planToEdit.description || '');
                setView('review');
            } else {
                resetToSelection();
                form.reset({ title: '', items: [] });
            }
        } else {
            // Cleanup when dialog closes
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
    }, [open, planToEdit, form]);

    // Initialize SpeechRecognition
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
                        handleGeneratePlan(finalTranscript);
                    }
                };
                recognitionRef.current.onerror = (event: any) => {
                    if (event.error === 'not-allowed') showNotification({ type: 'error', title: 'Microphone Access Denied' });
                    else showNotification({ type: 'error', title: 'Speech Recognition Error', description: event.error });
                    setIsRecording(false);
                    setView('selection');
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
    
    // Camera logic
    useEffect(() => {
        if (view !== 'camera') {
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
            setSelectedDeviceId(deviceId);
    
            if(!streamRef.current) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }
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
      }, [view, selectedDeviceId]);

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

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUri = e.target?.result as string;
            setImageUri(dataUri);
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
            resetToSelection();
        } else {
            handleGeneratePlan(result.text);
        }
    };

    const handleGeneratePlan = async (query: string) => {
        if (!query) return;
        setView('loading');
        setUserQuery(query);
        const result = await createFinancialPlanAction({ 
            userQuery: query,
            existingPlan: planToEdit ? form.getValues() : undefined
        });
        
        if ('error' in result) {
            showNotification({ type: 'error', title: 'AI Error', description: result.error });
            resetToSelection();
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

    const renderSelectionView = () => (
        <div className="pt-4">
            <DialogDescription>How would you like to create your plan?</DialogDescription>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => setView('typing')}>
                    <Keyboard className="h-6 w-6" />
                    <span>Describe with Text</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => setView('voice')}>
                    <Mic className="h-6 w-6" />
                    <span>Use Voice</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => setView('camera')}>
                    <Camera className="h-6 w-6" />
                    <span>Scan with Camera</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-6 w-6" />
                    <span>Upload Document</span>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </Button>
            </div>
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or</span></div>
            </div>
            <Button className="w-full" onClick={() => {
                form.reset({ title: '', items: [] });
                setView('review');
            }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Manually
            </Button>
        </div>
    );
    
    const renderTypingView = () => (
        <div className="pt-4 space-y-4">
            <DialogDescription>Describe your financial plan. The AI will structure it into an itemized plan.</DialogDescription>
            <Textarea placeholder="e.g., A trip to Japan for two weeks..." value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetToSelection}>Back</Button>
                <Button onClick={() => handleGeneratePlan(userQuery)} disabled={!userQuery}>
                    <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
                </Button>
            </DialogFooter>
        </div>
    );

    const renderVoiceView = () => (
        <div className="pt-4 space-y-4 flex flex-col items-center justify-center min-h-[250px]">
            <DialogDescription>Start speaking and the AI will transcribe and create your plan.</DialogDescription>
            <Button onClick={handleToggleRecording} size="icon" className={cn("h-20 w-20 rounded-full", isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse')}>
                {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </Button>
            <p className="text-muted-foreground h-6">{isRecording ? "Listening..." : "Press to start recording"}</p>
            <DialogFooter className="w-full pt-4">
                <Button type="button" variant="ghost" onClick={resetToSelection} className="w-full">Back to Selection</Button>
            </DialogFooter>
        </div>
    );

    const renderCameraView = () => (
        <div className="pt-4 space-y-4">
            <DialogDescription>Position your document in the frame and capture an image to scan it.</DialogDescription>
            <div className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden rounded-lg">
                <canvas ref={canvasRef} className="hidden" />
                {imageUri ? (
                    <Image src={imageUri} alt="Plan document preview" layout="fill" objectFit="contain" />
                ) : (
                    <>
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        {hasCameraPermission === false && <Alert variant="destructive" className="absolute w-11/12"><Camera className="h-4 w-4" /><AlertTitle>Camera Access Denied</AlertTitle></Alert>}
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
                <Button onClick={handleCapture} disabled={hasCameraPermission === false} className="w-full"><Camera className="mr-2 h-4 w-4" />Capture Photo</Button>
            )}
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetToSelection} className="w-full">Back to Selection</Button>
            </DialogFooter>
        </div>
    );
    
    const renderLoadingView = () => (
        <div className="flex flex-col items-center justify-center space-y-4 h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">AI is crafting your plan...</p>
        </div>
    );

    const renderReviewView = () => (
        <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-4 pt-4">
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
    
            {!planToEdit && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Want to add more?</AlertTitle>
                <AlertDescription>You can modify your description below and regenerate the plan.</AlertDescription>
              </Alert>
            )}
            
            {!planToEdit && (
                <div className="space-y-2">
                    <Textarea 
                        placeholder="Type here to add more details to your plan..." 
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                    />
                    <Button variant="secondary" className="w-full" onClick={() => handleGeneratePlan(userQuery)} type="button">Update with AI</Button>
                </div>
            )}
    
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetToSelection}>Back to Selection</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>Save Plan</Button>
            </DialogFooter>
        </form>
    );

    const renderContent = () => {
        switch(view) {
            case 'selection': return renderSelectionView();
            case 'typing': return renderTypingView();
            case 'voice': return renderVoiceView();
            case 'camera': return renderCameraView();
            case 'loading': return renderLoadingView();
            case 'review': return renderReviewView();
            default: return renderSelectionView();
        }
    }


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[90vh] pr-6">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">{planToEdit ? 'Edit Financial Plan' : 'Create a New Financial Plan'}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {renderContent()}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
