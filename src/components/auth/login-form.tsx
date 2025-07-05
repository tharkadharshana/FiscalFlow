

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
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useAppContext } from '@/contexts/app-context';
import Link from 'next/link';

export function LoginForm() {
  const router = useRouter();
  const { showNotification } = useAppContext();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      showNotification({
        type: 'success',
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions to reset your password.',
      });
      setAuthMode('login');
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Reset Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewUserSetup = async (user: any) => {
    try {
        await setDoc(doc(db, "users", user.uid), {
            displayName: user.displayName,
            email: user.email,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            currencyPreference: 'USD',
            darkModeBanner: false,
            notificationPreferences: {
                budgetThreshold: true,
                recurringPayment: true,
            },
            profilePictureURL: user.photoURL || null,
            subscription: {
              tier: 'free',
              isActive: true,
              expiryDate: null,
            },
            hasCompletedOnboarding: false,
          }, { merge: true });
    } catch (error) {
        console.error("CRITICAL: Failed to create user document in Firestore.", error);
        showNotification({
            type: 'error',
            title: 'Account Setup Failed',
            description: 'Could not save your user profile. Please contact support.',
        });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    if (authMode === 'login') {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await updateDoc(doc(db, "users", userCredential.user.uid), {
            lastLoginAt: serverTimestamp(),
        });
        router.push('/dashboard');
      } catch (error: any) {
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
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await handleNewUserSetup(userCredential.user);
        await sendEmailVerification(userCredential.user);
        showNotification({
          type: 'success',
          title: 'Account Created',
          description: 'A verification email has been sent. Please check your inbox.',
        });
        router.push('/dashboard');
      } catch (error: any) {
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

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        await handleNewUserSetup(result.user);
        showNotification({
          type: 'success',
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
      } else {
        await updateDoc(doc(db, "users", result.user.uid), {
            lastLoginAt: serverTimestamp(),
        });
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      showNotification({
        type: 'error',
        title: 'Google Login Failed',
        description: error.message,
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsAppleLoading(true);
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);
      const additionalInfo = getAdditionalUserInfo(result);
      
      if (additionalInfo?.isNewUser) {
        await handleNewUserSetup(result.user);
        showNotification({
          type: 'success',
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
      } else {
        await updateDoc(doc(db, "users", result.user.uid), {
            lastLoginAt: serverTimestamp(),
        });
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
          showNotification({
              type: 'info',
              title: 'Sign-in Cancelled',
              description: 'The sign-in window was closed before completion.',
          });
      } else {
        showNotification({
          type: 'error',
          title: 'Apple Login Failed',
          description: error.message,
        });
      }
    } finally {
      setIsAppleLoading(false);
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
                <Button variant="outline" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading || isAppleLoading}>
                  {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Icons.google className="mr-2 h-4 w-4" />}
                  Google
                </Button>
                <Button variant="outline" onClick={handleAppleLogin} disabled={isLoading || isGoogleLoading || isAppleLoading}>
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
