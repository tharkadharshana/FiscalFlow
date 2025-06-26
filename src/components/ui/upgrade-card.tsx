
'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './card';
import { Button } from './button';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type UpgradeCardProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
  features?: { text: string; icon: LucideIcon }[];
};

export function UpgradeCard({ title, description, icon: Icon, className, features }: UpgradeCardProps) {
  return (
    <Card className={cn(
      "flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-900/50 border-dashed",
      className
    )}>
      <CardHeader>
        {Icon && <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />}
        <CardTitle className="font-headline">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="w-full">
        {features && (
          <ul className="space-y-2 text-sm text-left text-muted-foreground mb-6">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3">
                <feature.icon className="h-5 w-5 text-primary" />
                <span>{feature.text}</span>
              </li>
            ))}
          </ul>
        )}
        <Button asChild className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
          <Link href="/dashboard/upgrade">
            <Sparkles className="mr-2 h-4 w-4" />
            Upgrade to Premium
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
