// src/components/dashboard/settings/gmail-connect.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppContext } from '@/contexts/app-context';
import { CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function GmailConnect() {
  const { userProfile } = useAppContext();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConnect = () => {
    if (!userProfile?.uid) return;
    setLoading(true);
    // Redirect to our own API route which will then redirect to Google
    router.push(`/api/auth/google?userId=${userProfile.uid}`);
  };

  if (userProfile?.gmailConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-medium">
        <CheckCircle className="h-5 w-5" />
        <span>Gmail Connected</span>
      </div>
    );
  }

  return (
    <Button onClick={handleConnect} disabled={loading}>
      {loading ? 'Connecting...' : <Icons.google className="mr-2 h-4 w-4" />}
      {loading ? 'Redirecting...' : 'Connect Gmail Account'}
    </Button>
  );
}
