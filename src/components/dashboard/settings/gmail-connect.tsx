// src/components/dashboard/settings/gmail-connect.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAppContext } from '@/contexts/app-context';
import { CheckCircle } from 'lucide-react';
import { logger } from '@/lib/logger';

export function GmailConnect() {
  const { userProfile } = useAppContext();

  const handleConnect = () => {
    if (userProfile?.uid) {
      logger.info('Initiating Gmail connection', { userId: userProfile.uid });
      // Use window.top.location.href to ensure the redirect happens at the top-level,
      // breaking out of any potential iframes from the development environment.
      // This is crucial for Google's OAuth flow to prevent framing errors.
      if (window.top) {
        window.top.location.href = `/api/auth/google?userId=${userProfile.uid}`;
      }
    } else {
      logger.warn('Gmail connect clicked but no user ID was available.');
    }
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
    <Button onClick={handleConnect} disabled={!userProfile?.uid}>
      <Icons.google className="mr-2 h-4 w-4" />
      Connect Gmail Account
    </Button>
  );
}
