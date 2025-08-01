

'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Camera, Upload, RotateCcw, SwitchCamera, Trash2, Plus, CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/contexts/app-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import type { ParsedBill } from '@/types/schemas';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { nanoid } from 'nanoid';
import { ScrollArea } from './ui/scroll-area';

type ReceiptScannerProps = {
    onTransactionsAdded: () => void;
}

export function ReceiptScanner({ onTransactionsAdded }: ReceiptScannerProps) {
  const { addTransaction, showNotification, scanReceiptWithLimit, expenseCategories, formatCurrency } = useAppContext();
  
  // Component state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedBill, setParsedBill] = useState<ParsedBill | null>(null);
  const [view, setView] = useState<'capture' | 'review'>('capture');

  // Camera-specific state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

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
          const backCamera = cameras.find(device => device.label.toLowerCase().includes('back'));
          setSelectedDeviceId(backCamera ? backCamera.deviceId : cameras[0].deviceId);
        } else {
            setHasCameraPermission(false);
        }
      } catch (error) {
        console.error('Error enumerating devices:', error);
        setHasCameraPermission(false);
      }
    };
    getDevices();
    
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Start stream when a device is selected
  useEffect(() => {
    if (!selectedDeviceId) return;
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());

    const getStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedDeviceId } } });
            streamRef.current = stream;
            setHasCameraPermission(true);
            if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (error) {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
        }
    };
    getStream();
  }, [selectedDeviceId]);

  const handleAnalyze = async () => {
    if (!imageUri) return;
    setIsLoading(true);
    setParsedBill(null);
    
    const result = await scanReceiptWithLimit({ photoDataUri: imageUri });
    
    setIsLoading(false);

    if (!result) {
        showNotification({ type: 'error', title: 'Analysis Failed', description: 'The AI did not return a response.' });
        return;
    }

    if (result && 'error' in result) {
      if (result.error !== 'Limit Reached') showNotification({ type: 'error', title: 'Analysis Failed', description: result.error });
    } else if (result && result.bill) {
      setParsedBill(result.bill);
      setView('review');
      showNotification({ type: 'success', title: 'Analysis Complete', description: 'Please review the extracted information.' });
    } else {
        showNotification({ type: 'warning', title: 'No Bill Found', description: 'The AI could not find structured data on this receipt.' });
    }
  };
  
  const handleSaveTransaction = async () => {
    if (!parsedBill) return;
    setIsLoading(true);
    
    // Group line items by a suggested category (simple logic for now)
    const categoryCounts: Record<string, number> = {};
    parsedBill.lineItems?.forEach(item => {
        const foundCategory = expenseCategories.find(cat => item.description.toLowerCase().includes(cat.toLowerCase().slice(0, -1)));
        const category = foundCategory || 'Groceries';
        if (!categoryCounts[category]) categoryCounts[category] = 0;
        categoryCounts[category]++;
    });
    const primaryCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b, 'Groceries');

    const transactionItems = parsedBill.lineItems?.map(item => ({
        id: nanoid(),
        description: item.description,
        amount: item.totalPrice,
    })) || [];

    await addTransaction({
        type: 'expense',
        amount: parsedBill.totalAmount,
        source: parsedBill.merchantName || 'Scanned Receipt',
        category: primaryCategory,
        date: parsedBill.transactionDate ? new Date(parsedBill.transactionDate).toISOString() : new Date().toISOString(),
        items: transactionItems,
        notes: `Receipt from ${parsedBill.merchantName}. Payment: ${parsedBill.paymentMethod || 'N/A'}`,
        ocrParsed: true,
        receiptDetails: parsedBill,
    });

    setIsLoading(false);
    onTransactionsAdded();
  }

  const resetScanner = () => {
    setImageUri(null);
    setParsedBill(null);
    setIsLoading(false);
    setView('capture');
  }

  const renderCaptureView = () => (
    <div className="space-y-4">
        <Card className="relative aspect-video flex items-center justify-center bg-muted/50 overflow-hidden">
            {isLoading && (
                <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <p className="mt-4 text-muted-foreground">Analyzing receipt...</p>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            {imageUri ? <Image src={imageUri} alt="Receipt preview" fill objectFit="contain" />
            : (<><video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />{hasCameraPermission === false && <Alert variant="destructive" className="absolute w-11/12"><Camera className="h-4 w-4" /><AlertTitle>Camera Access Denied</AlertTitle><AlertDescription>Please enable camera permissions.</AlertDescription></Alert>}</>)}
            {videoDevices.length > 1 && !imageUri && <Button type="button" onClick={() => {if (videoDevices.length < 2) return; const currentIndex = videoDevices.findIndex(d => d.deviceId === selectedDeviceId); const nextIndex = (currentIndex + 1) % videoDevices.length; setSelectedDeviceId(videoDevices[nextIndex].deviceId);}} variant="outline" size="icon" className="absolute bottom-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white border-white/50"><SwitchCamera className="h-5 w-5" /></Button>}
        </Card>
        {imageUri ? (
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={resetScanner} variant="outline" disabled={isLoading}><RotateCcw className="mr-2 h-4 w-4" />Retake</Button>
                <Button onClick={handleAnalyze} disabled={isLoading}><Wand2 className="mr-2 h-4 w-4" />Analyze</Button>
            </div>
        ) : (
            <div className="grid grid-cols-2 gap-4">
                <Button onClick={() => { if (videoRef.current && canvasRef.current) { const v = videoRef.current; const c = canvasRef.current; c.width = v.videoWidth; c.height = v.videoHeight; c.getContext('2d')?.drawImage(v,0,0,v.videoWidth,v.videoHeight); setImageUri(c.toDataURL('image/jpeg'));}}} disabled={!hasCameraPermission || isLoading}><Camera className="mr-2 h-4 w-4" />Capture Photo</Button>
                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" disabled={isLoading}><Upload className="mr-2 h-4 w-4" />Upload Image</Button>
                <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if(f){const r = new FileReader(); r.onload=ev=>setImageUri(ev.target?.result as string); r.readAsDataURL(f)}}} className="hidden" accept="image/*" />
            </div>
        )}
    </div>
  );
  
  const renderReviewView = () => {
    if (!parsedBill) return null;

    return (
    <div className="space-y-4">
        <CardHeader className="p-0">
            <CardTitle className="font-headline">Review Extracted Bill</CardTitle>
            <CardDescription>AI has extracted the following details. Please review and confirm before saving.</CardDescription>
        </CardHeader>
        <ScrollArea className="h-96 w-full pr-4">
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="text-center space-y-1">
                        <p className="font-bold">{parsedBill.merchantName || "Merchant Name"}</p>
                        <p className="text-xs text-muted-foreground">{parsedBill.merchantAddress}</p>
                        <p className="text-xs text-muted-foreground">{parsedBill.merchantPhone}</p>
                    </div>
                    
                    <div className="text-center text-xs text-muted-foreground">
                        <p>{parsedBill.transactionDate} {parsedBill.transactionTime}</p>
                        <p>Receipt #: {parsedBill.receiptNumber || 'N/A'}</p>
                    </div>

                    <div className="border-t border-dashed -mx-4"/>

                    {parsedBill.lineItems && parsedBill.lineItems.length > 0 && (
                         <div className="space-y-1 font-mono text-xs">
                             {parsedBill.lineItems.map((item, i) => (
                                 <div key={i} className="flex justify-between">
                                     <span>{item.quantity || 1} x {item.description}</span>
                                     <span>{formatCurrency(item.totalPrice)}</span>
                                 </div>
                             ))}
                         </div>
                    )}
                   
                    <div className="border-t border-dashed -mx-4"/>

                    <div className="space-y-1 font-mono text-xs">
                        {parsedBill.subtotal && <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(parsedBill.subtotal)}</span></div>}
                        {parsedBill.taxes?.map((tax, i) => (
                             <div key={i} className="flex justify-between"><span className="text-muted-foreground">{tax.description}</span><span>{formatCurrency(tax.amount)}</span></div>
                        ))}
                         {parsedBill.discounts?.map((discount, i) => (
                             <div key={i} className="flex justify-between"><span className="text-muted-foreground">{discount.description}</span><span>-{formatCurrency(discount.amount)}</span></div>
                        ))}
                    </div>

                     <div className="border-t -mx-4"/>
                    
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(parsedBill.totalAmount)}</span>
                    </div>
                    <div className="text-sm text-center text-muted-foreground">
                        Paid with {parsedBill.paymentMethod || 'Unknown'}
                    </div>

                </CardContent>
            </Card>
        </ScrollArea>
        <CardFooter className="flex-col gap-4 items-stretch p-0 pt-4">
            <Button onClick={handleSaveTransaction} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Confirm & Save Transaction
            </Button>
            <Button onClick={resetScanner} variant="outline">Scan Another Receipt</Button>
        </CardFooter>
    </div>
  )};

  return view === 'capture' ? renderCaptureView() : renderReviewView();
}
