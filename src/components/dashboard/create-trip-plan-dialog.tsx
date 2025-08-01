

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Mic, Loader2, Wand2, Trash2, Sparkles, Lightbulb, Plus, Keyboard, Upload, Camera, SwitchCamera, RotateCcw, MicOff, FileScan } from 'lucide-react';
import { createTripPlanAction, parseDocumentAction } from '@/lib/actions';
import type { TripPlan } from '@/types';
import { useAppContext } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { nanoid } from 'nanoid';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { TripItemSchema } from '@/types/schemas';
import { useTranslation } from '@/contexts/translation-context';


type CreateTripPlanDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripToEdit?: TripPlan | null;
};

const formSchema = z.object({
  title: z.string().min(3, 'Trip title must be at least 3 characters.'),
  items: z.array(TripItemSchema),
});

type FormData = z.infer<typeof formSchema>;


export function CreateTripPlanDialog({ open, onOpenChange, tripToEdit: tripToEdit }: CreateTripPlanDialogProps) {
    const { addTripPlan, updateTripPlan, showNotification } = useAppContext();
    const { t } = useTranslation();

    const [view, setView] = useState<'input' | 'loading' | 'review'>('input');
    const [userQuery, setUserQuery] = useState('');
    const [activeTab, setActiveTab] = useState('text');
    
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
  
    // Effect to reset state when dialog opens or tripToEdit changes
    useEffect(() => {
        if(open) {
            if (tripToEdit) {
                form.reset({
                    title: tripToEdit.title,
                    items: tripToEdit.items.map(item => ({...item, actualCost: item.actualCost ?? null}))
                });
                setUserQuery(tripToEdit.description || '');
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
    }, [open, tripToEdit, form]);

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
                    if (event.error === 'not-allowed') showNotification({ type: 'error', title: t('notifications.micDenied') });
                    else showNotification({ type: 'error', title: t('notifications.speechError'), description: event.error });
                    setIsRecording(false);
                };
                recognitionRef.current.onend = () => setIsRecording(false);
            }
        }
    }, [showNotification, t]);

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
            setIsRecording(true);
        }
    };
    
    // Camera logic
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
            setSelectedDeviceId(deviceId); // Set it after successfully getting the stream
            setHasCameraPermission(true);
          } catch (error) {
            logger.error('Error accessing camera:', error as Error);
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
            showNotification({ type: 'error', title: t('notifications.scanFailed'), description: result.error });
            resetToInputView();
        } else {
            handleGeneratePlan(result.text);
        }
    };

    const handleGeneratePlan = async (query: string) => {
        if (!query) return;
        setView('loading');
        setUserQuery(query);
        const result = await createTripPlanAction({ 
            userQuery: query,
            existingPlan: tripToEdit ? form.getValues() : undefined
        });
        
        if ('error' in result) {
            showNotification({ type: 'error', title: t('notifications.aiError'), description: result.error });
            resetToInputView();
        } else {
            form.reset({
                title: result.title,
                items: result.items
            });
            setView('review');
        }
    };

    const handleSavePlan = async (data: FormData) => {
        const totalPredictedCost = data.items.reduce((sum, item) => sum + item.predictedCost, 0);
        const planData: Omit<TripPlan, 'id' | 'userId' | 'createdAt'> = {
          ...data,
          items: data.items.map(item => ({...item, actualCost: null })),
          description: userQuery,
          status: 'planning',
          totalPredictedCost,
          totalActualCost: tripToEdit?.totalActualCost || 0,
        };

        if (tripToEdit) {
            await updateTripPlan(tripToEdit.id, planData);
        } else {
            await addTripPlan(planData);
        }
        onOpenChange(false);
    };

    const renderPlanForm = ({ isReviewMode }: { isReviewMode: boolean }) => (
        <form onSubmit={form.handleSubmit(handleSavePlan)} className="space-y-4 pt-4">
            <DialogDescription>
              {isReviewMode 
                ? t('dialogs.addTrip.reviewDescription')
                : t('dialogs.addTrip.manualDescription')
              }
            </DialogDescription>
            <div className="space-y-2">
                <Label htmlFor="plan-title">{t('dialogs.addTrip.titleLabel')}</Label>
                <Input id="plan-title" {...form.register('title')} />
                {form.formState.errors.title && <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>}
            </div>
            <div className="space-y-2">
                <Label>{t('dialogs.addTrip.itemsLabel')}</Label>
                <ScrollArea className="h-48 w-full pr-3">
                    <div className="space-y-3">
                        {fields.map((field, index) => (
                            <div key={field.id} className={cn(
                                "flex items-start gap-2 rounded-md border p-3",
                                field.isAiSuggested && "border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10"
                            )}>
                                {field.isAiSuggested && <Lightbulb className="h-5 w-5 mt-5 text-amber-500 flex-shrink-0"/>}
                                <div className="flex-1 grid grid-cols-5 gap-x-3 gap-y-1">
                                    <div className="col-span-3">
                                    <Label className="text-xs text-muted-foreground">{t('dialogs.addTrip.itemDescriptionLabel')}</Label>
                                    <Input {...form.register(`items.${index}.description`)} className="h-8"/>
                                    </div>
                                    <div className="col-span-2">
                                    <Label className="text-xs text-muted-foreground">{t('dialogs.addTrip.itemCostLabel')}</Label>
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
                    <Plus className="mr-2 h-4 w-4" /> {t('dialogs.addTrip.addItemButton')}
                </Button>
                {form.formState.errors.items && <p className="text-sm text-destructive mt-2">{t('dialogs.addTrip.itemErrors')}</p>}
            </div>
    
            {isReviewMode && !tripToEdit && (
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>{t('dialogs.addTrip.addMoreTitle')}</AlertTitle>
                <AlertDescription>{t('dialogs.addTrip.addMoreDescription')}</AlertDescription>
              </Alert>
            )}
            
            {isReviewMode && !tripToEdit && (
                <div className="space-y-2">
                    <Textarea 
                        placeholder={t('dialogs.addTrip.addMorePlaceholder')}
                        value={userQuery}
                        onChange={(e) => setUserQuery(e.target.value)}
                    />
                    <Button variant="secondary" className="w-full" onClick={() => handleGeneratePlan(userQuery)} type="button">{t('dialogs.buttons.updateAI')}</Button>
                </div>
            )}
    
            <DialogFooter>
                {isReviewMode && <Button type="button" variant="ghost" onClick={resetToInputView}>{t('dialogs.buttons.back')}</Button>}
                <Button type="submit" disabled={form.formState.isSubmitting}>{t('dialogs.buttons.savePlan')}</Button>
            </DialogFooter>
        </form>
    );

    const renderLoadingView = () => (
        <div className="flex flex-col items-center justify-center space-y-4 h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">{t('dialogs.addTrip.loading')}</p>
        </div>
    );
    
    const renderContent = () => {
        if (view === 'loading') return renderLoadingView();
        if (view === 'review') return renderPlanForm({ isReviewMode: true });

        // Otherwise, view is 'input', so show the Tabs
        return (
          <Tabs defaultValue="text" value={activeTab} className="w-full pt-4" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 h-auto">
              <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> {t('dialogs.tabs.text')}</TabsTrigger>
              <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> {t('dialogs.tabs.voice')}</TabsTrigger>
              <TabsTrigger value="camera" className="flex-col h-14"><Camera className="mb-1" /> {t('dialogs.tabs.camera')}</TabsTrigger>
              <TabsTrigger value="upload" className="flex-col h-14"><Upload className="mb-1" /> {t('dialogs.tabs.upload')}</TabsTrigger>
              <TabsTrigger value="manual" className="flex-col h-14"><Plus className="mb-1" /> {t('dialogs.tabs.manual')}</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="pt-4 space-y-4">
                <DialogDescription>{t('dialogs.addTrip.textDescription')}</DialogDescription>
                <Textarea placeholder={t('dialogs.addTrip.textPlaceholder')} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} />
                <DialogFooter>
                    <Button onClick={() => handleGeneratePlan(userQuery)} disabled={!userQuery}>
                        <Wand2 className="mr-2 h-4 w-4" /> {t('dialogs.buttons.generateAI')}
                    </Button>
                </DialogFooter>
            </TabsContent>

            <TabsContent value="voice" className="pt-4 space-y-4 flex flex-col items-center justify-center">
                <DialogDescription>{t('dialogs.addTrip.voiceDescription')}</DialogDescription>
                <Button onClick={handleToggleRecording} size="icon" className={cn("h-20 w-20 rounded-full my-4", isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse')}>
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <p className="text-muted-foreground h-6">{isRecording ? t('dialogs.addTrip.listening') : t('dialogs.addTrip.pressToRecord')}</p>
            </TabsContent>

            <TabsContent value="camera" className="pt-4 space-y-4">
                <DialogDescription>{t('dialogs.addTrip.cameraDescription')}</DialogDescription>
                <div className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden rounded-lg">
                    <canvas ref={canvasRef} className="hidden" />
                    {imageUri ? (
                        <Image src={imageUri} alt="Plan document preview" fill objectFit="contain" />
                    ) : (
                        <>
                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                            {hasCameraPermission === false && <Alert variant="destructive" className="absolute w-11/12"><Camera className="h-4 w-4" /><AlertTitle>{t('notifications.cameraDenied')}</AlertTitle></Alert>}
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
                        <Button onClick={() => setImageUri(null)} variant="outline"><RotateCcw className="mr-2 h-4 w-4" />{t('dialogs.buttons.retake')}</Button>
                        <Button onClick={() => handleAnalyze()}><Wand2 className="mr-2 h-4 w-4" />{t('dialogs.buttons.analyze')}</Button>
                    </div>
                ) : (
                    <Button onClick={handleCapture} disabled={hasCameraPermission === false} className="w-full"><Camera className="mr-2 h-4 w-4" />{t('dialogs.buttons.capture')}</Button>
                )}
            </TabsContent>

            <TabsContent value="upload" className="pt-4 flex flex-col items-center justify-center space-y-4 h-full">
                <DialogDescription>{t('dialogs.addTrip.uploadDescription')}</DialogDescription>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm">
                    <FileScan className="mr-2 h-4 w-4" />
                    {t('dialogs.buttons.chooseFile')}
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </TabsContent>

            <TabsContent value="manual" className="pt-0">
               {renderPlanForm({ isReviewMode: false })}
            </TabsContent>

          </Tabs>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <ScrollArea className="max-h-[90vh] p-6">
                    <DialogHeader className="pr-6">
                        <DialogTitle className="font-headline text-2xl">{tripToEdit ? t('dialogs.addTrip.editTitle') : t('dialogs.addTrip.addTitle')}</DialogTitle>
                    </DialogHeader>
                    {renderContent()}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
