'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getCategorySuggestion } from '@/lib/actions';
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

const sampleReceiptText = `
STARBUCKS STORE #123
123 COFFEE St.
SEATTLE, WA 98101

Date: ${new Date().toLocaleDateString()}
Time: 08:30 AM

1 GRANDE LATTE   $4.75
1 CROISSANT      $3.25

SUBTOTAL         $8.00
TAX (10.1%)      $0.81
TOTAL            $8.81

THANK YOU!
`;

type ReceiptScannerProps = {
    onTransactionAdded: () => void;
}

export function ReceiptScanner({ onTransactionAdded }: ReceiptScannerProps) {
  const [ocrText, setOcrText] = useState(sampleReceiptText);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ suggestedCategory: string; confidence: number } | null>(null);
  const { toast } = useToast();
  const { addTransaction } = useAppContext();

  const [amount, setAmount] = useState(8.81);
  const [description, setDescription] = useState('Coffee at Starbucks');
  const [category, setCategory] = useState('');

  const handleAnalyze = async () => {
    setIsLoading(true);
    setSuggestion(null);
    const result = await getCategorySuggestion({ ocrText });
    setIsLoading(false);

    if ('error' in result) {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: result.error,
      });
    } else {
      setSuggestion(result);
      setCategory(result.suggestedCategory);
    }
  };
  
  const handleAddTransaction = () => {
    if (!amount || !description || !category) {
        toast({
            variant: 'destructive',
            title: 'Missing Information',
            description: 'Please fill out all fields.',
        });
        return;
    }
    
    addTransaction({
        type: 'expense',
        amount: amount,
        description: description,
        category: category,
        date: new Date().toISOString(),
    });
    onTransactionAdded();
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="ocr-text">Receipt Text (OCR Output)</Label>
        <Textarea
          id="ocr-text"
          value={ocrText}
          onChange={(e) => setOcrText(e.target.value)}
          rows={8}
          placeholder="Paste receipt text here..."
        />
        <p className="text-xs text-muted-foreground mt-1">
            For demonstration, you can edit this sample text. In a real app, this would come from a camera scan.
        </p>
      </div>

      <Button onClick={handleAnalyze} disabled={isLoading} className="w-full">
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wand2 className="mr-2 h-4 w-4" />
        )}
        Analyze with AI
      </Button>

      {suggestion && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>AI Suggestion Ready!</AlertTitle>
          <AlertDescription>
            We think this is in the <span className="font-bold">{suggestion.suggestedCategory}</span> category.
          </AlertDescription>
        </Alert>
      )}

        <Card>
            <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" placeholder="8.81" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value))} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="e.g. Coffee at Starbucks" value={description} onChange={(e) => setDescription(e.target.value)} />
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
             <Button onClick={handleAddTransaction} className="w-full font-bold">Confirm & Add Transaction</Button>
            </CardContent>
        </Card>
    </div>
  );
}
