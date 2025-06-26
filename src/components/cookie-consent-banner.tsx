
'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('cookie_consent');
      if (consent === null) {
        setIsVisible(true);
      }
    } catch (e) {
      // localStorage is not available
      console.warn('Could not access localStorage for cookie consent.');
    }
  }, []);

  const handleConsent = () => {
    try {
      localStorage.setItem('cookie_consent', 'true');
      setIsVisible(false);
    } catch (e) {
      setIsVisible(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 p-4 bg-background border-t shadow-lg transition-transform transform-gpu',
        isVisible ? 'translate-y-0' : 'translate-y-full'
      )}
    >
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to make our site work. By continuing to use this site, you agree to our use of cookies. Read our{' '}
          <Link href="/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
          .
        </p>
        <Button onClick={handleConsent} size="sm">
          Accept
        </Button>
      </div>
    </div>
  );
}
