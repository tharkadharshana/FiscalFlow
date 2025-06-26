
'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/app-context';
import { PlusCircle, Briefcase, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Investment } from '@/types';
import { AddInvestmentDialog } from '@/components/dashboard/add-investment-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function InvestmentsPage() {
  const { investments, deleteInvestment, formatCurrency } = useAppContext();
  const [isAddInvestmentDialogOpen, setIsAddInvestmentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [investmentToEdit, setInvestmentToEdit] = useState<Investment | null>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);

  const handleEditInvestment = (investment: Investment) => {
    setInvestmentToEdit(investment);
    setIsAddInvestmentDialogOpen(true);
  };
  
  const handleDeleteInvestment = (investment: Investment) => {
    setInvestmentToDelete(investment);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (investmentToDelete) {
      await deleteInvestment(investmentToDelete.id);
      setIsDeleteDialogOpen(false);
      setInvestmentToDelete(null);
    }
  };

  const handleInvestmentDialogClose = (open: boolean) => {
    if (!open) {
      setInvestmentToEdit(null);
    }
    setIsAddInvestmentDialogOpen(open);
  }

  const portfolioValue = investments.reduce((sum, inv) => sum + (inv.quantity * inv.currentPrice), 0);
  const totalCost = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchasePrice), 0);
  const totalGainLoss = portfolioValue - totalCost;

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Investment Portfolio" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(portfolioValue)}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
                        {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {formatCurrency(totalGainLoss)}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Your Holdings</CardTitle>
                        <CardDescription>
                            A detailed view of your investment assets.
                        </CardDescription>
                    </div>
                    <Button onClick={() => { setInvestmentToEdit(null); setIsAddInvestmentDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Investment
                    </Button>
                </CardHeader>
                <CardContent>
                    {investments.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Avg. Cost</TableHead>
                                    <TableHead className="text-right">Market Value</TableHead>
                                    <TableHead className="text-right">Gain / Loss</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {investments.map((inv) => {
                                    const marketValue = inv.quantity * inv.currentPrice;
                                    const costBasis = inv.quantity * inv.purchasePrice;
                                    const gainLoss = marketValue - costBasis;
                                    return (
                                        <TableRow key={inv.id}>
                                            <TableCell>
                                                <div className="font-medium">{inv.name}</div>
                                                <div className="text-sm text-muted-foreground">{inv.symbol}</div>
                                            </TableCell>
                                            <TableCell>{inv.assetType}</TableCell>
                                            <TableCell className="text-right">{inv.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(inv.purchasePrice)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(marketValue)}</TableCell>
                                            <TableCell className={cn("text-right", gainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                                                {formatCurrency(gainLoss)}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditInvestment(inv)}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleDeleteInvestment(inv)} className="text-destructive">
                                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
                            <Briefcase className="h-12 w-12 mb-4" />
                            <p className="text-lg font-semibold">No investments tracked yet.</p>
                            <p>Click "Add Investment" to build your portfolio.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
      </div>
      
      {/* Dialogs */}
      <AddInvestmentDialog open={isAddInvestmentDialogOpen} onOpenChange={handleInvestmentDialogClose} investmentToEdit={investmentToEdit} />
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your investment record for "{investmentToDelete?.name}".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
                Delete
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
