// src/components/dashboard/settings/gmail-connect.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppContext } from '@/contexts/app-context';
import { CheckCircle } from 'lucide-react';

export function GmailConnect() {
  const { userProfile } = useAppContext();

  if (userProfile?.gmailConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600 font-medium">
        <CheckCircle className="h-5 w-5" />
        <span>Gmail Connected</span>
      </div>
    );
  }

  // Use a standard anchor tag styled as a button to ensure a full-page redirect,
  // bypassing the Next.js client-side router which can cause issues with external OAuth flows.
  return (
    <Button asChild disabled={!userProfile?.uid}>
      <a href={userProfile?.uid ? `/api/auth/google?userId=${userProfile.uid}` : '#'}>
        <Icons.google className="mr-2 h-4 w-4" />
        Connect Gmail Account
      </a>
    </Button>
  );
}
