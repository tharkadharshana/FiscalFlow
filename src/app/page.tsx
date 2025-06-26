import { LoginForm } from '@/components/auth/login-form';
import { Wallet } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Wallet className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-headline text-4xl font-bold text-primary">
            FiscalFlow
          </h1>
          <p className="text-muted-foreground">
            Your financial journey starts here.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
