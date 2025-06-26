
'use client';

import { Header } from '@/components/dashboard/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/app-context';
import { Check, Sparkles, Wand2, ScanLine, Repeat, PiggyBank, Briefcase, Landmark, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';

const premiumFeatures = [
  { text: 'Unlimited Budgets', icon: Check },
  { text: 'AI Financial Planner', icon: Wand2 },
  { text: 'Unlimited Receipt Scanning', icon: ScanLine },
  { text: 'Automatic Recurring Transactions', icon: Repeat },
  { text: 'Gamified Savings Goals & Round-Up', icon: PiggyBank },
  { text: 'Investment Portfolio Tracking', icon: Briefcase },
  { text: 'AI-Powered Tax Analysis', icon: Landmark },
  { text: 'Advanced Reporting & Exports', icon: FileText },
];

export default function UpgradePage() {
  const { isPremium, upgradeToPremium, downgradeFromPremium, userProfile } = useAppContext();
  const router = useRouter();

  const handleUpgrade = async () => {
    await upgradeToPremium();
    router.push('/dashboard');
  };
  
  const handleDowngrade = async () => {
    await downgradeFromPremium();
    router.push('/dashboard');
  };
  
  const renderContent = () => {
      if (isPremium) {
          return (
             <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white">
                        <Check className="h-8 w-8" />
                    </div>
                    <CardTitle className="font-headline text-3xl">You are a Premium Member!</CardTitle>
                    <CardDescription>
                        You have access to all of FiscalFlow's powerful features.
                        {userProfile?.subscription?.expiryDate && (
                            ` Your subscription is valid until ${new Date(userProfile.subscription.expiryDate).toLocaleDateString()}.`
                        )}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-center text-muted-foreground">Thank you for supporting FiscalFlow. If you wish to cancel your subscription, you can do so below.</p>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleDowngrade} variant="destructive" className="w-full">
                        Cancel Subscription
                    </Button>
                </CardFooter>
             </Card>
          )
      }

      return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                <Sparkles className="h-8 w-8" />
                </div>
                <CardTitle className="font-headline text-3xl">FiscalFlow Premium</CardTitle>
                <CardDescription>Unlock your full financial potential. Supercharge your finances with AI.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm text-muted-foreground">
                {premiumFeatures.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-green-500" />
                    <span>{feature.text}</span>
                    </li>
                ))}
                </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button onClick={handleUpgrade} className="w-full text-lg h-12 bg-gradient-to-r from-primary to-blue-600 hover:opacity-90">
                    Upgrade for $4.99/month
                </Button>
                <Button variant="link" className="text-muted-foreground">Or $49.99 per year (Save 15%)</Button>
            </CardFooter>
        </Card>
      );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Header title="Upgrade Plan" />
      <main className="flex-1 p-4 md:p-6 flex items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
}
