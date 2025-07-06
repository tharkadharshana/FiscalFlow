
'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppContext, FREE_TIER_LIMITS } from '@/contexts/app-context';
import { PlusCircle, Briefcase, TrendingUp, TrendingDown, MoreVertical, Pencil, Trash2, Loader2, Globe } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCoinGeckoMarketData } from '@/lib/actions';
import { logger } from '@/lib/logger';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CryptoTracker } from '@/components/dashboard/crypto-tracker';

export default function InvestmentsPage() {
  const { investments, deleteInvestment, formatCurrency, isPremium, showNotification } = useAppContext();
  const [isAddInvestmentDialogOpen, setIsAddInvestmentDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [investmentToEdit, setInvestmentToEdit] = useState<Investment | null>(null);
  const [investmentToDelete, setInvestmentToDelete] = useState<Investment | null>(null);

  const [livePrices, setLivePrices] = useState<Record<string, { price: number; image: string; }>>({});
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  useEffect(() => {
    const fetchLivePrices = async () => {
      const cryptoIds = investments
        .filter(inv => inv.assetType === 'Crypto' && inv.coinGeckoId)
        .map(inv => inv.coinGeckoId!);

      if (cryptoIds.length > 0) {
        setIsLoadingPrices(true);
        const result = await getCoinGeckoMarketData({ coinIds: cryptoIds });
        if ('error' in result) {
            logger.error('Failed to fetch live crypto prices', new Error(result.error));
            showNotification({ type: 'error', title: 'Could not fetch live prices', description: result.error });
        } else {
            const priceMap = result.reduce((acc, coin) => {
                acc[coin.id] = { price: coin.current_price, image: coin.image };
                return acc;
            }, {} as Record<string, { price: number; image: string; }>);
            setLivePrices(priceMap);
        }
        setIsLoadingPrices(false);
      }
    }
    fetchLivePrices();
  }, [investments, showNotification]);

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

  const getLivePrice = (investment: Investment): number => {
    if (investment.assetType === 'Crypto' && investment.coinGeckoId && livePrices[investment.coinGeckoId]) {
      return livePrices[investment.coinGeckoId].price;
    }
    return investment.currentPrice;
  };
  
  const portfolioValue = investments.reduce((sum, inv) => sum + (inv.quantity * getLivePrice(inv)), 0);
  const totalCost = investments.reduce((sum, inv) => sum + (inv.quantity * inv.purchasePrice), 0);
  const totalGainLoss = portfolioValue - totalCost;

  const canAddInvestment = isPremium || investments.length < FREE_TIER_LIMITS.investments;

  const AddInvestmentButton = (
    <Button onClick={() => { setInvestmentToEdit(null); setIsAddInvestmentDialogOpen(true); }} disabled={!canAddInvestment}>
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Investment
    </Button>
  );

  return (
    <>
      <div className="flex flex-1 flex-col">
        <Header title="Investments" />
        <main className="flex-1 space-y-6 p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Portfolio Value</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {formatCurrency(portfolioValue)}
                            {isLoadingPrices && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Total Gain/Loss</CardTitle>
                        {totalGainLoss >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                            {formatCurrency(totalGainLoss)}
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Tabs defaultValue="portfolio">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="portfolio"><Briefcase className="mr-2 h-4 w-4" />My Portfolio</TabsTrigger>
                <TabsTrigger value="crypto"><Globe className="mr-2 h-4 w-4" />Crypto Tracker</TabsTrigger>
              </TabsList>

              <TabsContent value="portfolio" className="mt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Your Holdings</CardTitle>
                            <CardDescription>
                                A detailed view of your investment assets. Crypto prices are updated live.
                            </CardDescription>
                        </div>
                        {canAddInvestment ? (
                            AddInvestmentButton
                        ) : (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>{AddInvestmentButton}</TooltipTrigger>
                                    <TooltipContent>
                                        <p>Upgrade to Premium for unlimited investments.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
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
                                        const currentPrice = getLivePrice(inv);
                                        const marketValue = inv.quantity * currentPrice;
                                        const costBasis = inv.quantity * inv.purchasePrice;
                                        const gainLoss = marketValue - costBasis;
                                        const isCrypto = inv.assetType === 'Crypto' && inv.coinGeckoId;
                                        const cryptoImage = isCrypto ? livePrices[inv.coinGeckoId!]?.image : null;

                                        return (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        {isCrypto && cryptoImage && <Image src={cryptoImage} alt={inv.name} width={24} height={24} />}
                                                        <div>
                                                            <div className="font-medium">{inv.name}</div>
                                                            <div className="text-sm text-muted-foreground">{inv.symbol}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{inv.assetType}</TableCell>
                                                <TableCell className="text-right">{inv.quantity.toLocaleString()}</TableCell>
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
              </TabsContent>
              <TabsContent value="crypto" className="mt-4">
                  <Card>
                      <CardHeader>
                          <CardTitle>Cryptocurrency Market</CardTitle>
                          <CardDescription>
                              Live market data for top cryptocurrencies, provided by CoinGecko.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <CryptoTracker />
                      </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
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
