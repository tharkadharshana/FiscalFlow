
import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="bg-background text-foreground">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-headline text-xl font-bold text-primary">FiscalFlow</span>
        </Link>
      </header>
      <main className="max-w-4xl mx-auto p-6 md:p-10">
        <div className="prose prose-lg dark:prose-invert">
          <h1>Terms of Service</h1>
          <p><em>Last Updated: [Date]</em></p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account and using the FiscalFlow application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            FiscalFlow is a personal finance application that helps users track expenses, manage budgets, and plan their financial goals using manual data entry and AI-powered tools. The Service is provided on an "as-is" and "as-available" basis.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            You are responsible for safeguarding your account credentials. You agree to notify us immediately of any unauthorized use of your account. You must provide accurate and complete information when creating your account.
          </p>

          <h2>4. User Conduct and Content</h2>
          <p>
            You are solely responsible for all financial data and other content that you input into the Service. You agree not to use the Service for any unlawful purpose or to violate any laws in your jurisdiction.
          </p>

          <h2>5. Subscription and Fees</h2>
          <p>
            FiscalFlow offers both a free and a premium subscription plan. Fees for the premium plan will be billed on a monthly or annual basis. We reserve the right to change our subscription fees upon 30 days' notice.
          </p>
          
          <h2>6. Disclaimers</h2>
          <p>
            The financial advice, tax calculations, and carbon footprint estimates provided by FiscalFlow are for informational and illustrative purposes only. They do not constitute professional financial, legal, or tax advice. You should consult with a qualified professional before making any financial decisions. We do not warrant that the service will be error-free or uninterrupted.
          </p>
          
          <h2>7. Limitation of Liability</h2>
          <p>
            In no event shall FiscalFlow, its developers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, or other intangibles, arising out of or in connection with your use of the Service.
          </p>

          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account at any time, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
          </p>
          
          <h2>9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:support@fiscalflow.app">support@fiscalflow.app</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
