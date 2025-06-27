
'use client';

import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getCoinGeckoMarketData } from '@/lib/actions';
import { useAppContext } from '@/contexts/app-context';
import type { CoinGeckoMarketData } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export function CryptoTracker() {
  const { formatCurrency } = useAppContext();
  const [coins, setCoins] = useState<CoinGeckoMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchCoins = async () => {
      setIsLoading(true);
      setError(null);
      const result = await getCoinGeckoMarketData({ page, perPage: 25 });
      if ('error' in result) {
        setError(result.error);
      } else {
        setCoins(result);
      }
      setIsLoading(false);
    };

    fetchCoins();
  }, [page]);

  if (isLoading && coins.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Fetching Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Coin</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">24h %</TableHead>
            <TableHead className="text-right hidden md:table-cell">Market Cap</TableHead>
            <TableHead className="text-right hidden sm:table-cell">Volume (24h)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coins.map((coin) => (
            <TableRow key={coin.id}>
              <TableCell>{coin.market_cap_rank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Image src={coin.image} alt={coin.name} width={24} height={24} />
                  <div>
                    <div className="font-medium">{coin.name}</div>
                    <div className="text-sm text-muted-foreground">{coin.symbol.toUpperCase()}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(coin.current_price)}</TableCell>
              <TableCell className={cn(
                "text-right",
                coin.price_change_percentage_24h >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {coin.price_change_percentage_24h.toFixed(2)}%
              </TableCell>
              <TableCell className="text-right hidden md:table-cell">{formatCurrency(coin.market_cap)}</TableCell>
              <TableCell className="text-right hidden sm:table-cell">{formatCurrency(coin.total_volume)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center">
        <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <Button onClick={() => setPage(p => p + 1)} disabled={isLoading}>
          Next
        </Button>
      </div>
    </div>
  );
}
