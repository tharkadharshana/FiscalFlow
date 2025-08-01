

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
import { Mic, MicOff, Loader2, Wand2, Keyboard, Plus, Trash2, Lightbulb, Camera, Upload, RotateCcw, SwitchCamera, FileScan } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Budget } from '@/types';
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
import { extractTextAction } from '@/lib/actions';
import Image from 'next/image';
import { logger } from '@/lib/logger';
import { useTranslation } from '@/contexts/translation-context';

// --------- Zod Schemas ---------
const budgetItemSchema = z.object({
  id: z.string(),
  description: z.string().min(1, "Description can't be empty."),
  predictedCost: z.coerce.number().optional(),
});

const singleBudgetSchema = z.object({
  id: z.string().optional(), // ID is optional now, will be assigned by Firestore
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
    const { t } = useTranslation();
    const { fields, append, remove } = useFieldArray({
      control,
      name: `budgets.${budgetIndex}.items`,
    });

    return (
        <div className="space-y-2 mt-2">
            <Label className="text-xs text-muted-foreground">{t('dialogs.addBudget.itemsLabel')}</Label>
            <ScrollArea className="h-40 w-full rounded-md border p-2">
                <div className="space-y-2">
                    {fields.map((item, itemIndex) => (
                        <div key={item.id} className="flex items-center gap-2">
                            <Input {...register(`budgets.${budgetIndex}.items.${itemIndex}.description`)} placeholder={t('dialogs.addBudget.itemPlaceholder')} className="h-8"/>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => remove(itemIndex)}>
                                <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({id: nanoid(), description: '', predictedCost: 0})}>
                <Plus className="mr-2 h-4 w-4" /> {t('dialogs.addBudget.addItemButton')}
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
  const { userProfile, budgets: existingBudgets, showNotification, addBudget, updateBudget, expenseCategories, createBudgetsWithLimit } = useAppContext();
  const { t } = useTranslation();

  type View = 'input' | 'loading' | 'review';
  const [view, setView] = useState<View>('input');
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
    defaultValues: { budgets: [] },
  });

  const { fields, remove, append, replace } = useFieldArray({
    control: form.control,
    name: 'budgets',
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
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    }
  }, [open, budgetToEdit, replace]);
  
  const handleSaveBudgets = async (data: FormData) => {
    let count = 0;
    for (const budget of data.budgets) {
        const { id, ...dataToSave } = budget;
        const finalData = { ...dataToSave, userInput: userQuery || '' };

        if (id && budgetToEdit && id === budgetToEdit.id) {
            await updateBudget(id, finalData);
        } else {
            await addBudget(finalData);
        }
        count++;
    }
    if (count > 0) {
      showNotification({
        type: 'success',
        title: budgetToEdit ? t('notifications.budgetUpdated') : t('notifications.budgetsCreated', { count }),
        description: budgetToEdit ? t('notifications.budgetUpdatedDesc', { category: data.budgets[0].category }) : t('notifications.budgetsCreatedDesc'),
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
                showNotification({ type: 'error', title: t('notifications.micDenied') });
            } else {
                showNotification({ type: 'error', title: t('notifications.speechError'), description: event.error });
            }
            setIsRecording(false);
        };
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, [showNotification, t]);
  
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
  
  const handleAnalyze = async (dataUri?: string) => {
    const finalImageUri = dataUri || imageUri;
    if (!finalImageUri) return;

    setView('loading');
    const result = await extractTextAction({ photoDataUri: finalImageUri });
    if ('error' in result) {
        showNotification({ type: 'error', title: t('notifications.scanFailed'), description: result.error });
        resetToInputView();
    } else {
        handleGenerateBudgets(result.text);
    }
  };

  const handleGenerateBudgets = async (query: string) => {
    if (!query) return;
    setView('loading');
    setUserQuery(query);
    const existingBudgetCategories = existingBudgets.map(b => b.category);
    const result = await createBudgetsWithLimit(query, existingBudgetCategories);
    
    if (result && 'error' in result) {
        showNotification({ type: 'error', title: t('notifications.aiError'), description: result.error });
        resetToInputView();
    } else if (result) {
        replace(result.budgets.map(b => ({...b, id: nanoid() })));
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
  
  const renderReviewForm = ({ isReviewMode }: { isReviewMode: boolean }) => (
    <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(handleSaveBudgets)} className="space-y-4">
            <DialogDescription>
                {isReviewMode
                    ? t('dialogs.addBudget.reviewDescription')
                    : t('dialogs.addBudget.manualDescription')
                }
            </DialogDescription>
            <ScrollArea className="h-[400px] pr-4">
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
                                                <FormLabel className="text-xs text-muted-foreground">{t('dialogs.addBudget.categoryLabel')}</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value} disabled={!!budgetToEdit}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue placeholder={t('dialogs.addBudget.categoryPlaceholder')} />
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
                                                <FormLabel className="text-xs text-muted-foreground">{t('dialogs.addBudget.limitLabel', { currency: userProfile?.currencyPreference || '$' })}</FormLabel>
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
                        <AlertTitle>{t('dialogs.addBudget.noBudgetsFound')}</AlertTitle>
                        <AlertDescription>
                            {t('dialogs.addBudget.noBudgetsDesc')}
                        </AlertDescription>
                    </Alert>
                )}
                {!budgetToEdit && (
                    <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ id: nanoid(), category: '', limit: 0, items: [] })}>
                        <Plus className="mr-2 h-4 w-4" /> {t('dialogs.addBudget.addAnotherButton')}
                    </Button>
                )}
                </div>
            </ScrollArea>
            <DialogFooter>
                {view === 'review' && !budgetToEdit && <Button type="button" variant="ghost" onClick={resetToInputView}>{t('dialogs.buttons.back')}</Button>}
                <Button type="submit" disabled={form.formState.isSubmitting || fields.length === 0}>{t('dialogs.buttons.saveBudgets')}</Button>
            </DialogFooter>
        </form>
    </FormProvider>
  );

  const renderContent = () => {
    if (view === 'loading') return <div className="flex flex-col items-center justify-center space-y-4 h-[400px]"><Loader2 className="h-12 w-12 animate-spin text-primary" /><p className="text-muted-foreground">{t('dialogs.addBudget.loading')}</p></div>;
    if (view === 'review') return renderReviewForm({ isReviewMode: true });

    // Otherwise, view is 'input', so show the Tabs
    return (
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        if (value === 'manual' && view === 'input' && fields.length === 0) {
            replace([{ id: nanoid(), category: '', limit: 0, items: [] }]);
            setView('review'); // Switch to review view for manual entry
        }
      }} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> {t('dialogs.tabs.text')}</TabsTrigger>
          <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> {t('dialogs.tabs.voice')}</TabsTrigger>
          <TabsTrigger value="camera" className="flex-col h-14"><Camera className="mb-1" /> {t('dialogs.tabs.camera')}</TabsTrigger>
          <TabsTrigger value="upload" className="flex-col h-14"><Upload className="mb-1" /> {t('dialogs.tabs.upload')}</TabsTrigger>
          <TabsTrigger value="manual" className="flex-col h-14"><Plus className="mb-1" /> {t('dialogs.tabs.manual')}</TabsTrigger>
        </TabsList>
        <div className="pt-4">
          <TabsContent value="text">
              <div className="flex flex-col space-y-4">
                  <DialogDescription>{t('dialogs.addBudget.textDescription')}</DialogDescription>
                  <Textarea placeholder={t('dialogs.addBudget.textPlaceholder', { currency: userProfile?.currencyPreference || '$' })} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6}/>
                  <DialogFooter>
                      <Button onClick={() => handleGenerateBudgets(userQuery)} disabled={!userQuery}>
                          <Wand2 className="mr-2 h-4 w-4" /> {t('dialogs.buttons.generateAI')}
                      </Button>
                  </DialogFooter>
              </div>
          </TabsContent>
          <TabsContent value="voice">
              <div className="h-full flex flex-col items-center justify-center space-y-4 min-h-[300px]">
                <DialogDescription>{t('dialogs.addBudget.voiceDescription')}</DialogDescription>
                <Button onClick={handleToggleRecording} size="icon" className={`h-20 w-20 rounded-full my-4 ${isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse'}`}>
                    {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </Button>
                <p className="text-muted-foreground h-6">{isRecording ? t('dialogs.addBudget.listening') : t('dialogs.addBudget.pressToRecord')}</p>
              </div>
          </TabsContent>
          <TabsContent value="camera">
              <div className="pt-4 space-y-4">
                <DialogDescription>{t('dialogs.addBudget.cameraDescription')}</DialogDescription>
                <div className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden rounded-lg">
                    <canvas ref={canvasRef} className="hidden" />
                    {imageUri ? (
                        <Image src={imageUri} alt="Budget preview" fill style={{ objectFit: 'contain' }} />
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
              </div>
            </TabsContent>
            <TabsContent value="upload">
                <div className="flex flex-col items-center justify-center h-full space-y-4 min-h-[300px]">
                    <DialogDescription>{t('dialogs.addBudget.uploadDescription')}</DialogDescription>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full max-w-sm"><FileScan className="mr-2 h-4 w-4" />{t('dialogs.buttons.chooseFile')}</Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>
            </TabsContent>
          <TabsContent value="manual">
              {renderReviewForm({ isReviewMode: false })}
          </TabsContent>
        </div>
      </Tabs>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <ScrollArea className="max-h-[90vh] p-6">
            <DialogHeader className="pr-6">
                <DialogTitle className="font-headline text-2xl">{budgetToEdit ? t('dialogs.addBudget.editTitle') : t('dialogs.addBudget.addTitle')}</DialogTitle>
            </DialogHeader>
            {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
