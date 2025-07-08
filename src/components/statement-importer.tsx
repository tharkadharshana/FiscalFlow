'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Wand2, FileText, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useAppContext } from '@/contexts/app-context';
import { parseBankStatementAction } from '@/lib/actions';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';
import { Checkbox } from './ui/checkbox';

type ParsedTx = {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    include: boolean;
};

type StatementImporterProps = {
    onTransactionsAdded: () => void;
};

export function StatementImporter({ onTransactionsAdded }: StatementImporterProps) {
    const { addTransaction, showNotification, expenseCategories, incomeCategories, formatCurrency } = useAppContext();
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState<'upload' | 'review' | 'success'>('upload');
    const [parsedTxs, setParsedTxs] = useState<ParsedTx[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
        } else {
            showNotification({ type: 'error', title: 'Invalid File Type', description: 'Please select a PDF file.' });
            setFile(null);
        }
    };

    const handleAnalyze = async () => {
        if (!file) return;
        setIsLoading(true);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            const fileDataUri = e.target?.result as string;
            const result = await parseBankStatementAction({ fileDataUri });

            setIsLoading(false);
            if ('error' in result) {
                showNotification({ type: 'error', title: 'Analysis Failed', description: result.error });
            } else {
                setParsedTxs(result.transactions.map(tx => ({
                    id: nanoid(),
                    date: tx.date,
                    description: tx.description,
                    amount: Math.abs(tx.amount),
                    type: tx.amount >= 0 ? 'income' : 'expense',
                    category: tx.category,
                    include: true,
                })));
                setView('review');
            }
        };
    };
    
    const handleItemChange = (id: string, field: keyof ParsedTx, value: any) => {
        setParsedTxs(prev => prev.map(tx => (tx.id === id ? { ...tx, [field]: value } : tx)));
    };
    
    const handleRemoveItem = (id: string) => {
        setParsedTxs(prev => prev.filter(tx => tx.id !== id));
    };
    
    const handleSaveTransactions = async () => {
        setIsLoading(true);
        const transactionsToSave = parsedTxs.filter(tx => tx.include);
        
        try {
            for (const tx of transactionsToSave) {
                const transactionData: Omit<Transaction, 'id' | 'icon'> = {
                    amount: tx.amount,
                    category: tx.category,
                    date: new Date(tx.date).toISOString(),
                    source: tx.description.substring(0, 50), // Use description as source
                    notes: `Imported from statement: ${tx.description}`,
                    type: tx.type,
                };
                await addTransaction(transactionData);
            }
            showNotification({ type: 'success', title: `${transactionsToSave.length} Transactions Imported!`, description: 'Your statement has been successfully imported.' });
            setView('success');
        } catch(error) {
            showNotification({ type: 'error', title: 'Import Failed', description: 'There was an error saving your transactions.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    if (view === 'success') {
        return (
            <div className="text-center space-y-4 py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Import Complete</h3>
                <p className="text-muted-foreground">{parsedTxs.filter(tx => tx.include).length} transactions were added to your account.</p>
                <Button onClick={onTransactionsAdded}>Done</Button>
            </div>
        )
    }

    if (view === 'review') {
        const includedCount = parsedTxs.filter(tx => tx.include).length;
        return (
            <div className="space-y-4">
                <CardHeader className="p-0">
                    <CardTitle className="font-headline">Review Transactions</CardTitle>
                    <CardDescription>Review the transactions extracted from your statement. Uncheck any you wish to exclude.</CardDescription>
                </CardHeader>
                <ScrollArea className="h-96 w-full pr-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-10 px-2"><Checkbox onCheckedChange={(checked) => setParsedTxs(prev => prev.map(tx => ({...tx, include: !!checked})))} checked={parsedTxs.every(tx => tx.include)} /></TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {parsedTxs.map(tx => (
                                <TableRow key={tx.id}>
                                    <TableCell className="px-2">
                                        <Checkbox checked={tx.include} onCheckedChange={checked => handleItemChange(tx.id, 'include', !!checked)} />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={tx.description} onChange={e => handleItemChange(tx.id, 'description', e.target.value)} className="h-8"/>
                                    </TableCell>
                                    <TableCell>
                                        <Select value={tx.category} onValueChange={value => handleItemChange(tx.id, 'category', value)}>
                                            <SelectTrigger className="h-8"><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                {tx.type === 'expense' ? expenseCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>) : incomeCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Input type="number" value={tx.amount} onChange={e => handleItemChange(tx.id, 'amount', e.target.value)} className={cn('text-right h-8', tx.type === 'income' ? 'text-green-600' : 'text-foreground')} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
                <CardFooter className="flex-col gap-4 items-stretch p-0 pt-4">
                    <div className="flex justify-between font-bold">
                        <span>Total to import:</span>
                        <span>{includedCount} transaction(s)</span>
                    </div>
                    <Button onClick={handleSaveTransactions} disabled={isLoading || includedCount === 0}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        Confirm & Save
                    </Button>
                    <Button onClick={() => setView('upload')} variant="outline">Cancel</Button>
                </CardFooter>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <CardHeader className="p-0">
                <CardTitle className="font-headline">Import from Statement</CardTitle>
                <CardDescription>Upload a bank statement PDF and let AI extract your transactions.</CardDescription>
            </CardHeader>
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Experimental Feature</AlertTitle>
                <AlertDescription>
                    Statement parsing is new. Please double-check the extracted data for accuracy.
                </AlertDescription>
            </Alert>
            <Card className="border-2 border-dashed">
                <CardContent className="p-6 text-center space-y-4">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="application/pdf" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Choose PDF File
                    </Button>
                    {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
                </CardContent>
            </Card>
            <Button onClick={handleAnalyze} disabled={!file || isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Analyze Statement
            </Button>
        </div>
    );
}
