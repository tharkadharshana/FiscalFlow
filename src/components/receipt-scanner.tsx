'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, CheckCircle, Camera, Upload, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/app-context';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '@/components/ui/select';
import { defaultCategories } from '@/data/mock-data';
import { Textarea } from './ui/textarea';
import type { ParseReceiptOutput } from '@/ai/flows/parse-receipt';
import { parseReceiptAction } from '@/lib/actions';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import Image from 'next/image';


type ReceiptScannerProps = {
    onTransactionAdded: () => void;
}

export function ReceiptScanner({ onTransactionAdded }: ReceiptScannerProps) {
  const { addTransaction, financialPlans } = useAppContext();
  const { toast } = useToast();
  
  // Component state
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedData, setParsedData] = useState<ParseReceiptOutput | null>(null);

  // Form state
  const [amount, setAmount] = useState<number | string>('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [financialPlanId, setFinancialPlanId] = useState<string | undefined>();
  const [planItemId, setPlanItemId] = useState<string | undefined>();
  
  const selectedPlanItems = useMemo(() => {
    if (!financialPlanId) return [];
    const plan = financialPlans.find(p => p.id === financialPlanId);
    return plan?.items || [];
  }, [financialPlanId, financialPlans]);


  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Request camera permission on mount
  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({video: true});
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };
    getCameraPermission();

    return () => {
      // Cleanup: stop video stream when component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, []);

  // Effect to populate form when AI analysis is complete
  useEffect(() => {
    if (parsedData) {
      setAmount(parsedData.totalAmount || '');
      setSource(parsedData.storeName || '');
      setCategory(parsedData.suggestedCategory || '');
      
      const notesFromItems = parsedData.lineItems
        ?.map(item => `${item.description} - ${item.amount || 'N/A'}`)
        .join('\n');
      setNotes(notesFromItems || parsedData.rawText || '');
      
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
    const result = await parseReceiptAction({ photoDataUri: imageUri });
    setIsLoading(false);

    if ('error' in result) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error,
      });
    } else {
      setParsedData(result);
      toast({
        title: 'Analysis Complete',
        description: 'Please review the extracted information.',
      });
    }
  };
  
  const handleAddTransaction = () => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (!numericAmount || !source || !category || !date) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out amount, source, category, and date.',
        });
        return;
    }
    
    addTransaction({
        type: 'expense',
        amount: numericAmount,
        source: source,
        notes: notes,
        category: category,
        date: date.toISOString(),
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
    setAmount('');
    setSource('');
    setNotes('');
    setCategory('');
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
                        <Label htmlFor="amount">Amount</Label>
                        <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
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
                            <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            />
                        </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="source">Source / Store</Label>
                    <Input id="source" placeholder="e.g. Starbucks" value={source} onChange={(e) => setSource(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select onValueChange={setCategory} value={category}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            {defaultCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                                {cat}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Link to Plan (Optional)</h3>
                    <div className="space-y-2">
                        <Label>Financial Plan</Label>
                        <Select onValueChange={(value) => {
                            setFinancialPlanId(value === 'none' ? undefined : value);
                            setPlanItemId(undefined);
                        }} value={financialPlanId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a plan" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {financialPlans.filter(p => p.status === 'planning' || p.status === 'active').map(plan => (
                                    <SelectItem key={plan.id} value={plan.id}>{plan.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {financialPlanId && (
                        <div className="space-y-2">
                            <Label>Plan Item</Label>
                            <Select onValueChange={setPlanItemId} value={planItemId}>
                                <SelectTrigger disabled={!financialPlanId}>
                                    <SelectValue placeholder="Select an item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedPlanItems.map(item => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.description} (Predicted: ${item.predictedCost})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="notes">Notes (from line items)</Label>
                    <Textarea id="notes" placeholder="e.g. Coffee and croissant" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}/>
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
