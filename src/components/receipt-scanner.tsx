

'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Camera, Upload, RotateCcw, SwitchCamera, Trash2, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/contexts/app-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import type { ParseReceiptOutput } from '@/ai/flows/parse-receipt';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { nanoid } from 'nanoid';
import type { TransactionItem } from '@/types';
import { ScrollArea } from './ui/scroll-area';


type ReceiptScannerProps = {
    onTransactionAdded: () => void;
}

export function ReceiptScanner({ onTransactionAdded }: ReceiptScannerProps) {
  const { addTransaction, financialPlans, showNotification, scanReceiptWithLimit, expenseCategories, formatCurrency } = useAppContext();
  
  // Component state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParseReceiptOutput | null>(null);

  // Camera-specific state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  // Form state
  const [source, setSource] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [financialPlanId, setFinancialPlanId] = useState<string | undefined>();
  const [planItemId, setPlanItemId] = useState<string | undefined>();

  const totalAmount = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
  
  const selectedPlanItems = useMemo(() => {
    if (!financialPlanId) return [];
    const plan = financialPlans.find(p => p.id === financialPlanId);
    return plan?.items || [];
  }, [financialPlanId, financialPlans]);


  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get list of cameras on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true }); // Prompt for permission first
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setVideoDevices(cameras);

        if (cameras.length > 0) {
          // Prefer the back camera if available
          const backCamera = cameras.find(device => device.label.toLowerCase().includes('back'));
          setSelectedDeviceId(backCamera ? backCamera.deviceId : cameras[0].deviceId);
        } else {
            setHasCameraPermission(false); // No cameras found
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
        setHasCameraPermission(false);
      }
    };
    getDevices();
    
    // Cleanup function to stop stream on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start stream when a device is selected
  useEffect(() => {
    if (!selectedDeviceId) return;

    // Stop any previous stream
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }

    const getStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: selectedDeviceId } }
            });
            streamRef.current = stream; // Keep a ref to the stream for cleanup
            setHasCameraPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            if (error instanceof Error && error.name === "NotAllowedError") {
                 showNotification({
                    type: 'error',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.'
                });
            }
        }
    };

    getStream();
  }, [selectedDeviceId, showNotification]);

  const handleSwitchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIndex = videoDevices.findIndex(device => device.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIndex].deviceId);
  };


  // Effect to populate form when AI analysis is complete
  useEffect(() => {
    if (parsedData) {
      setSource(parsedData.storeName || '');
      setCategory(parsedData.suggestedCategory || '');
      
      const initialItems = parsedData.lineItems?.map(item => ({
          id: nanoid(),
          description: item.description,
          amount: item.amount || 0,
      })) || [];

      if (initialItems.length > 0) {
        setItems(initialItems);
      } else if (parsedData.totalAmount) {
        setItems([{ id: nanoid(), description: 'Total Purchase', amount: parsedData.totalAmount }]);
      }
      
      if (parsedData.transactionDate) {
        try {
          // Add time to avoid timezone issues where it might be the previous day.
          const parsedDate = parseISO(parsedData.transactionDate + 'T12:00:00.000Z');
          if (isValid(parsedDate)) {
              setDate(parsedDate);
          } else {
            setDate(new Date());
          }
        } catch (e) {
          console.error("Could not parse date from AI", e);
          setDate(new Date());
        }
      } else {
        setDate(new Date());
      }
    }
  }, [parsedData]);


  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUri = canvas.toDataURL('image/jpeg');
        setImageUri(dataUri);
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUri(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setIsLoading(true);
    setParsedData(null);
    
    const result = await scanReceiptWithLimit({ photoDataUri: imageUri });
    
    setIsLoading(false);

    if (result && 'error' in result) {
      // Notification is handled by the context, so we just check for the error
      if (result.error !== 'Limit Reached') {
        showNotification({
          type: 'error',
          title: 'Analysis Failed',
          description: result.error,
        });
      }
    } else if (result) {
      setParsedData(result);
      showNotification({
        type: 'success',
        title: 'Analysis Complete',
        description: 'Please review the extracted information.',
      });
    }
  };
  
  const handleItemChange = (id: string, field: 'description' | 'amount', value: string | number) => {
    setItems(prevItems => prevItems.map(item => 
        item.id === id 
            ? { ...item, [field]: field === 'amount' ? parseFloat(value.toString()) || 0 : value } 
            : item
    ));
  };
  
  const handleAddItem = () => {
      setItems(prevItems => [...prevItems, { id: nanoid(), description: '', amount: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
      setItems(prevItems => prevItems.filter(item => item.id !== id));
  };
  
  const handleAddTransaction = () => {
    if (totalAmount <= 0 || !source || !category || !date) {
        showNotification({
            type: 'error',
            title: 'Missing Information',
            description: 'Please fill out source, category, date, and at least one item with an amount.',
        });
        return;
    }
    
    addTransaction({
        type: 'expense',
        amount: totalAmount,
        source: source,
        category: category,
        date: date.toISOString(),
        items: items,
        ocrParsed: true,
        financialPlanId: financialPlanId,
        planItemId: planItemId,
    });
    onTransactionAdded();
  }

  const resetScanner = () => {
    setImageUri(null);
    setParsedData(null);
    setIsLoading(false);
    // Reset form fields
    setSource('');
    setCategory('');
    setItems([]);
    setDate(new Date());
    setFinancialPlanId(undefined);
    setPlanItemId(undefined);
  }

  // The form part of the UI, shown after analysis
  if (parsedData) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Review Transaction</CardTitle>
                    <CardDescription>AI has extracted the following information. Please review and correct if necessary.</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="source">Source / Store</Label>
                            <Input id="source" placeholder="e.g. Starbucks" value={source} onChange={(e) => setSource(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                            </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                
                    <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select onValueChange={setCategory} value={category}>
                            <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                            <SelectContent>
                                {expenseCategories.map((cat) => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Items</Label>
                        <div className="rounded-md border p-2">
                            <ScrollArea className="max-h-32 w-full pr-2">
                                <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.id} className="flex items-center gap-2">
                                    <Input
                                        placeholder="Item description"
                                        value={item.description}
                                        onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        type="number"
                                        placeholder="Amount"
                                        value={item.amount}
                                        onChange={(e) => handleItemChange(item.id, 'amount', e.target.value)}
                                        className="w-24"
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="shrink-0">
                                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    </div>
                                ))}
                                </div>
                            </ScrollArea>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="w-full mt-2">
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-between items-center font-bold text-lg border-t pt-4">
                        <span>Total:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                    </div>
                
                 <Button onClick={handleAddTransaction} className="w-full font-bold">Confirm & Add Transaction</Button>
                 <Button onClick={resetScanner} variant="outline" className="w-full">Scan Another Receipt</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  // The capture/preview part of the UI
  return (
    <div className="space-y-4">
        <Card className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden">
        {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Analyzing receipt...</p>
            </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {imageUri ? (
            <Image src={imageUri} alt="Receipt preview" layout="fill" objectFit="contain" />
        ) : (
            <>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {hasCameraPermission === false && (
                    <Alert variant="destructive" className="absolute w-11/12">
                        <Camera className="h-4 w-4" />
                        <AlertTitle>Camera Access Denied</AlertTitle>
                        <AlertDescription>
                            Please enable camera permissions in your browser settings.
                        </AlertDescription>
                    </Alert>
                )}
            </>
        )}
        
        {videoDevices.length > 1 && !imageUri && (
            <Button
                type="button"
                onClick={handleSwitchCamera}
                variant="outline"
                size="icon"
                className="absolute bottom-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-white/50"
            >
                <SwitchCamera className="h-5 w-5" />
                <span className="sr-only">Switch Camera</span>
            </Button>
        )}
        </Card>

      {imageUri ? (
        <div className="grid grid-cols-2 gap-4">
            <Button onClick={resetScanner} variant="outline" disabled={isLoading}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Retake
            </Button>
            <Button onClick={handleAnalyze} disabled={isLoading}>
                <Wand2 className="mr-2 h-4 w-4" />
                Analyze
            </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleCapture} disabled={!hasCameraPermission || isLoading}>
            <Camera className="mr-2 h-4 w-4" />
            Capture Photo
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" disabled={isLoading}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Image
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
          />
        </div>
      )}
    </div>
  );
}
