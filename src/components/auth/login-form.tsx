
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Icons } from '../icons';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPopup,
  getAdditionalUserInfo,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAppContext } from '@/contexts/app-context';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { countries } from '@/data/countries';
import { logger } from '@/lib/logger';
import { FREE_TIER_LIMITS } from '@/contexts/app-context';

export function LoginForm() {
  const router = useRouter();
  const { showNotification } = useAppContext();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('US');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  
  const handleNewUserSetup = async (user: User, countryCode: string) => {
    logger.info('Starting new user setup in Firestore', { userId: user.uid, email: user.email });
    try {
        const currentMonth = new Date().toISOString().slice(0, 7);

        // This is the new, standardized user profile object.
        const newUserProfile = {
            displayName: user.displayName,
            email: user.email,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            countryCode: countryCode,
            currencyPreference: 'USD',
            darkModeBanner: false,
            notificationPreferences: {
                budgetThreshold: true,
                recurringPayment: true,
            },
            profilePictureURL: user.photoURL || null,
            customCategories: [],
            activeTripId: null,
            gmailConnected: false,
            hasCompletedOnboarding: false,
            showOnboardingOnLogin: true,
            subscription: {
              tier: 'free',
              isActive: true,
              planType: null,
              expiryDate: null,
              monthlyOcrScans: { count: 0, month: currentMonth },
              monthlyRoundups: { count: 0, month: currentMonth },
              monthlyTaxReports: { count: 0, month: currentMonth },
              monthlyVoiceCommands: { count: 0, month: currentMonth },
              monthlyReports: { count: 0, month: currentMonth },
              monthlyInsights: { count: 0, month: currentMonth },
            },
          };

        await setDoc(doc(db, "users", user.uid), newUserProfile, { merge: true });
        logger.info('Successfully created user document in Firestore', { userId: user.uid });
    } catch (error) {
        logger.error("CRITICAL: Failed to create user document in Firestore.", error as Error, { userId: user.uid });
        showNotification({
            type: 'error',
            title: 'Account Setup Failed',
            description: 'Could not save your user profile. Please contact support.',
        });
        throw error; // re-throw to stop the auth flow
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    logger.info('Password reset initiated', { email });
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification({
        type: 'success',
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions to reset your password.',
      });
      logger.info('Password reset email sent successfully', { email });
      setAuthMode('login');
    } catch (error: any) {
      logger.error('Password reset failed', error, { email });
      showNotification({
        type: 'error',
        title: 'Reset Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (authMode === 'login') {
      logger.info('Login attempt started', { email });
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await updateDoc(doc(db, "users", userCredential.user.uid), {
            lastLoginAt: serverTimestamp(),
        });
        logger.info('Login successful, redirecting to dashboard', { userId: userCredential.user.uid });
        router.push('/dashboard');
      } catch (error: any) {
        logger.error('Email/password login failed', error, { email });
        showNotification({
          type: 'error',
          title: 'Login Failed',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Signup mode
      logger.info('Signup attempt started', { email });
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await handleNewUserSetup(userCredential.user, country);
        await sendEmailVerification(userCredential.user);
        logger.info('Signup successful, verification email sent', { userId: userCredential.user.uid });
        showNotification({
          type: 'success',
          title: 'Account Created',
          description: 'A verification email has been sent. Please check your inbox.',
        });
        router.push('/dashboard');
      } catch (error: any) {
        logger.error('Email/password signup failed', error, { email });
        showNotification({
          type: 'error',
          title: 'Sign Up Failed',
          description: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSocialLogin = async (provider: GoogleAuthProvider | OAuthProvider) => {
    const providerId = provider.providerId;
    logger.info('Social login initiated', { providerId });
    if (providerId.includes('google')) setIsGoogleLoading(true);
    if (providerId.includes('apple')) setIsAppleLoading(true);

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);
        
        if (additionalInfo?.isNewUser) {
            logger.info('New social login user detected', { userId: user.uid });
            await handleNewUserSetup(user, 'US'); // Default to 'US' for social signups
            showNotification({ type: 'success', title: 'Welcome!', description: 'Your account has been created.' });
        } else {
            logger.info('Existing social login user detected', { userId: user.uid });
            await updateDoc(doc(db, "users", user.uid), { lastLoginAt: serverTimestamp() });
        }
        router.push('/dashboard');
    } catch (error: any) {
        logger.error('Social login failed', error, { providerId });
        showNotification({ type: 'error', title: 'Login Failed', description: error.message });
    } finally {
        if (providerId.includes('google')) setIsGoogleLoading(false);
        if (providerId.includes('apple')) setIsAppleLoading(false);
    }
  };

  const renderHeader = () => {
    switch (authMode) {
      case 'login':
        return { title: 'Welcome Back', description: 'Enter your credentials to access your account.' };
      case 'signup':
        return { title: 'Create an Account', description: 'Enter your details to create a new account.' };
      case 'reset':
        return { title: 'Reset Your Password', description: "Enter your email and we'll send you a link." };
      default:
        return { title: '', description: '' };
    }
  }

  const { title, description } = renderHeader();

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {authMode === 'reset' ? (
            <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full font-bold" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <div className="mt-6 text-center text-sm">
                  Remembered your password?{' '}
                  <button
                      onClick={() => setAuthMode('login')}
                      className="font-bold text-primary hover:underline"
                      type="button"
                  >
                      Log in
                  </button>
                </div>
            </form>
          ) : (
              <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {authMode === 'login' && (
                      <button type="button" onClick={() => setAuthMode('reset')} className="text-sm font-medium text-primary hover:underline">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                 {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select onValueChange={setCountry} defaultValue={country}>
                        <SelectTrigger id="country">
                            <SelectValue placeholder="Select your country" />
                        </SelectTrigger>
                        <SelectContent>
                            {countries.map(c => (
                                <SelectItem key={c.value} value={c.value}>
                                    {c.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                )}
                <Button type="submit" className="w-full font-bold" disabled={isLoading || isGoogleLoading || isAppleLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {authMode === 'login' ? 'Log In' : 'Sign Up'}
                </Button>
              </form>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => handleSocialLogin(new GoogleAuthProvider())} disabled={isLoading || isGoogleLoading || isAppleLoading}>
                  {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                  Google
                </Button>
                <Button variant="outline" onClick={() => handleSocialLogin(new OAuthProvider('apple.com'))} disabled={isLoading || isGoogleLoading || isAppleLoading}>
                  {isAppleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.apple className="mr-2 h-4 w-4" />}
                  Apple
                </Button>
              </div>
              <div className="mt-6 text-center text-sm">
                {authMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="font-bold text-primary hover:underline"
                >
                  {authMode === 'login' ? 'Sign up' : 'Log in'}
                </button>
              </div>
              </>
          )}
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-primary">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link href="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </Link>
        .
      </footer>
    </>
  );
}
