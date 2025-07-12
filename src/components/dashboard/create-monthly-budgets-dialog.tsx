
'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Mic, MicOff, Loader2, Wand2, FileScan, Keyboard, Camera, Upload, SwitchCamera, RotateCcw } from 'lucide-react';
import { createMonthlyBudgetsAction, parseDocumentAction } from '@/lib/actions';
import { useAppContext } from '@/contexts/app-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { Budget } from '@/types';


type CreateMonthlyBudgetsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBudgetsGenerated: () => void;
};


export function CreateMonthlyBudgetsDialog({ open, onOpenChange, onBudgetsGenerated }: CreateMonthlyBudgetsDialogProps) {
  const { userProfile, budgets: existingBudgets, showNotification, setGeneratedBudgets } = useAppContext();

  const [view, setView] = useState<'input' | 'loading'>('input');
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
  
  useEffect(() => {
    if (open) {
        resetToInputView();
        setActiveTab('text');
    } else {
      // Cleanup when dialog closes
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [open]);

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
        handleGenerateBudgets(result.text);
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
        setGeneratedBudgets(result.budgets as Omit<Budget, 'id'>[]);
        onOpenChange(false);
        onBudgetsGenerated();
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

  const renderLoadingView = () => (
    <div className="flex flex-col items-center justify-center space-y-4 h-[400px]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">AI is crafting your budgets...</p>
    </div>
  )

    const renderContent = () => {
        if (view === 'loading') return renderLoadingView();

        return (
            <Tabs defaultValue="text" value={activeTab} className="w-full pt-4 h-full flex flex-col" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="text" className="flex-col h-14"><Keyboard className="mb-1" /> Text</TabsTrigger>
                <TabsTrigger value="voice" className="flex-col h-14"><Mic className="mb-1" /> Voice</TabsTrigger>
                <TabsTrigger value="camera" className="flex-col h-14"><Camera className="mb-1" /> Camera</TabsTrigger>
                <TabsTrigger value="upload" className="flex-col h-14"><Upload className="mb-1" /> Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="pt-4 space-y-4 flex-1 flex flex-col">
                    <DialogDescription>Describe your monthly budgets. The AI will structure them for you.</DialogDescription>
                    <Textarea placeholder={`e.g., Budget ${userProfile?.currencyPreference || '$'}500 for Groceries to buy milk, bread, and eggs. Also, ${userProfile?.currencyPreference || '$'}150 for transportation...`} value={userQuery} onChange={(e) => setUserQuery(e.target.value)} rows={6} className="flex-1"/>
                    <DialogFooter>
                        <Button onClick={() => handleGenerateBudgets(userQuery)} disabled={!userQuery}>
                            <Wand2 className="mr-2 h-4 w-4" /> Generate with AI
                        </Button>
                    </DialogFooter>
                </TabsContent>

                <TabsContent value="voice" className="pt-4 space-y-4 flex flex-col items-center justify-center flex-1">
                    <DialogDescription>Start speaking and the AI will transcribe and create your budgets.</DialogDescription>
                    <Button onClick={handleToggleRecording} size="icon" className={cn("h-20 w-20 rounded-full my-4", isRecording && 'bg-destructive hover:bg-destructive/90 animate-pulse')}>
                        {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                    </Button>
                    <p className="text-muted-foreground h-6">{isRecording ? "Listening..." : "Press to start recording"}</p>
                </TabsContent>

                <TabsContent value="camera" className="pt-4 space-y-4 flex-1 flex flex-col">
                    <DialogDescription>Position a document (like a shopping list) in the frame and capture an image to scan it.</DialogDescription>
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

                <TabsContent value="upload" className="pt-4 flex flex-col items-center justify-center space-y-4 flex-1">
                    <DialogDescription>Upload an image of a document, like a shopping list or quote.</DialogDescription>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose File
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </TabsContent>

            </Tabs>
        )
    }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 flex flex-col max-h-[90vh]">
        <DialogHeader className="p-6 pb-4">
            <DialogTitle className="font-headline text-2xl">Generate Budgets with AI</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 flex-1 min-h-0">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
