

'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, Camera, Upload, RotateCcw, SwitchCamera, Trash2, Plus, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppContext } from '@/contexts/app-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import type { ParsedReceiptTransaction } from '@/types/schemas';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { nanoid } from 'nanoid';
import { ScrollArea } from './ui/scroll-area';
import { Checkbox } from './ui/checkbox';

type ParsedTxWithId = ParsedReceiptTransaction & { id: string, include: boolean };

type ReceiptScannerProps = {
    onTransactionsAdded: () => void;
}

export function ReceiptScanner({ onTransactionsAdded }: ReceiptScannerProps) {
  const { addTransaction, showNotification, scanReceiptWithLimit, expenseCategories, formatCurrency } = useAppContext();
  
  // Component state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedTxs, setParsedTxs] = useState<ParsedTxWithId[]>([]);
  const [view, setView] = useState<'capture' | 'review'>('capture');

  // Camera-specific state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const totalAmount = useMemo(() => parsedTxs.filter(tx => tx.include).reduce((sum, tx) => sum + (tx.totalAmount || 0), 0), [parsedTxs]);

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
    setParsedTxs([]);
    
    const result = await scanReceiptWithLimit({ photoDataUri: imageUri });
    
    setIsLoading(false);

    if (result && 'error' in result) {
      if (result.error !== 'Limit Reached') showNotification({ type: 'error', title: 'Analysis Failed', description: result.error });
    } else if (result && result.transactions.length > 0) {
      setParsedTxs(result.transactions.map(tx => ({...tx, id: nanoid(), include: true})));
      setView('review');
      showNotification({ type: 'success', title: 'Analysis Complete', description: 'Please review the extracted information.' });
    } else {
        showNotification({ type: 'warning', title: 'No Transactions Found', description: 'The AI could not find any transactions on this receipt.' });
    }
  };
  
  const handleItemChange = (id: string, field: keyof ParsedTxWithId, value: any) => {
    setParsedTxs(prev => prev.map(tx => (tx.id === id ? { ...tx, [field]: value } : tx)));
  };
  
  const handleSaveTransactions = async () => {
    setIsLoading(true);
    const transactionsToSave = parsedTxs.filter(tx => tx.include);
    
    for (const tx of transactionsToSave) {
        if (!tx.totalAmount || !tx.storeName || !tx.suggestedCategory || !tx.transactionDate) {
            showNotification({ type: 'error', title: 'Missing Information', description: 'Please ensure all transactions have a store, category, date, and amount.' });
            setIsLoading(false);
            return;
        }
        await addTransaction({
            type: 'expense',
            amount: tx.totalAmount,
            source: tx.storeName,
            category: tx.suggestedCategory,
            date: new Date(tx.transactionDate).toISOString(),
            items: tx.lineItems?.map(item => ({...item, id: nanoid()})) || [],
            ocrParsed: true,
        });
    }
    setIsLoading(false);
    onTransactionsAdded();
  }

  const resetScanner = () => {
    setImageUri(null);
    setParsedTxs([]);
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
  
  const renderReviewView = () => (
    <div className="space-y-4">
        <CardHeader className="p-0">
            <CardTitle className="font-headline">Review Transactions</CardTitle>
            <CardDescription>AI has extracted and split the following transactions. Review and correct them before saving.</CardDescription>
        </CardHeader>
        <ScrollArea className="h-80 w-full pr-4">
            <div className="space-y-4">
            {parsedTxs.map((tx, txIndex) => (
                <Card key={tx.id} className={cn(!tx.include && "opacity-50 bg-muted/50")}>
                    <CardHeader className="p-4 flex flex-row items-start gap-4">
                        <Checkbox checked={tx.include} onCheckedChange={checked => handleItemChange(tx.id, 'include', !!checked)} className="mt-1" />
                        <div className="grid grid-cols-2 gap-4 flex-1">
                            <div className="space-y-1.5">
                                <Label>Store</Label>
                                <Input value={tx.storeName || ''} onChange={e => handleItemChange(tx.id, 'storeName', e.target.value)} className="h-8"/>
                            </div>
                             <div className="space-y-1.5">
                                <Label>Date</Label>
                                <Popover><PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal h-8", !tx.transactionDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{tx.transactionDate ? format(new Date(tx.transactionDate), "PPP") : <span>Pick a date</span>}</Button>
                                </PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={new Date(tx.transactionDate || new Date())} onSelect={(d) => handleItemChange(tx.id, 'transactionDate', d?.toISOString().split('T')[0])} initialFocus /></PopoverContent></Popover>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category</Label>
                                <Select value={tx.suggestedCategory} onValueChange={value => handleItemChange(tx.id, 'suggestedCategory', value)}>
                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                    <SelectContent>{expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                             <div className="space-y-1.5">
                                <Label>Total</Label>
                                <Input type="number" value={tx.totalAmount || 0} onChange={e => handleItemChange(tx.id, 'totalAmount', e.target.value)} className="h-8 text-right"/>
                            </div>
                        </div>
                    </CardHeader>
                    {tx.lineItems && tx.lineItems.length > 0 && (
                    <CardContent className="px-4 pb-4 pt-0">
                        <p className="text-xs text-muted-foreground mb-2">Line Items ({tx.lineItems.length})</p>
                        <div className="border-t pt-2 space-y-1">
                        {tx.lineItems.map((item, itemIndex) => (
                            <div key={itemIndex} className="flex justify-between text-xs">
                                <span className="truncate pr-2">{item.description}</span>
                                <span className="font-mono">{formatCurrency(item.amount || 0)}</span>
                            </div>
                        ))}
                        </div>
                    </CardContent>
                    )}
                </Card>
            ))}
            </div>
        </ScrollArea>
        <CardFooter className="flex-col gap-4 items-stretch p-0 pt-4">
            <div className="flex justify-between font-bold">
                <span>Total to import:</span>
                <span>{formatCurrency(totalAmount)}</span>
            </div>
            <Button onClick={handleSaveTransactions} disabled={isLoading || totalAmount === 0}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Confirm & Save Transactions
            </Button>
            <Button onClick={resetScanner} variant="outline">Scan Another Receipt</Button>
        </CardFooter>
    </div>
  );

  return view === 'capture' ? renderCaptureView() : renderReviewView();
}
