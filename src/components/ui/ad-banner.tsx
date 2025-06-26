
'use client';

import { Card } from './card';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Button } from './button';

export function AdBanner() {
  return (
    <Card className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Sparkles className="h-8 w-8 text-amber-400" />
          <div>
            <h3 className="font-bold">Upgrade to Premium</h3>
            <p className="text-sm text-slate-300">Unlock all features and remove ads.</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/upgrade">Upgrade Now</Link>
        </Button>
      </div>
    </Card>
  );
}
