'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Chrome, Loader2 } from 'lucide-react';
import { Icons } from '../icons';
import { auth, db } from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  getAdditionalUserInfo,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox for instructions to reset your password.',
      });
      setAuthMode('login');
    } catch (error: any) {
      toast({
        variant: 'destructive',
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
      try {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard');
      } catch (error: any) {
        toast({
          variant: 'destructive',
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
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          displayName: name,
          email: email,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          currencyPreference: 'USD',
          darkModeBanner: false,
          notificationPreferences: {
              budgetThreshold: true,
              recurringPayment: true,
          },
          profilePictureURL: userCredential.user.photoURL || null,
        });
        
        await sendEmailVerification(userCredential.user);
        toast({
          title: 'Account Created',
          description: 'A verification email has been sent. Please check your inbox.',
        });

        router.push('/dashboard');
      } catch (error: any) {
        toast({
          variant: 'destructive',
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
      
      // If it's a new user, create a document in Firestore
      if (additionalInfo?.isNewUser) {
        await setDoc(doc(db, 'users', result.user.uid), {
          displayName: result.user.displayName,
          email: result.user.email,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          currencyPreference: 'USD',
          darkModeBanner: false,
          notificationPreferences: {
            budgetThreshold: true,
            recurringPayment: true,
          },
          profilePictureURL: result.user.photoURL,
        });
        toast({
          title: 'Welcome!',
          description: 'Your account has been created successfully.',
        });
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Login Failed',
        description: error.message,
      });
    } finally {
      setIsGoogleLoading(false);
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
              <Button type="submit" className="w-full font-bold" disabled={isLoading || isGoogleLoading}>
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
              <Button variant="outline" onClick={handleGoogleLogin} disabled={isLoading || isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
                Google
              </Button>
              <Button variant="outline" disabled={true}>
                <Icons.apple className="mr-2 h-4 w-4" />
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
  );
}
