
import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function PrivacyPage() {
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
          <h1>Privacy Policy</h1>
          <p><em>Last Updated: [Date]</em></p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to FiscalFlow. We are committed to protecting your privacy and handling your personal and financial data with transparency and care. This Privacy Policy outlines the types of information we collect, how we use it, and the measures we take to protect it.
          </p>

          <h2>2. Information We Collect</h2>
          <ul>
            <li><strong>Account Information:</strong> When you sign up, we collect your name, email address, and authentication credentials.</li>
            <li><strong>Financial Data:</strong> You provide us with financial information, including transactions, income, expenses, budgets, savings goals, and investment details. This data is linked to your user account but is not shared with third parties.</li>
            <li><strong>AI Interaction Data:</strong> We collect the text and images you provide to our AI features (like receipt scans and financial plans) solely to provide the service and improve our models. This data is processed securely.</li>
            <li><strong>Usage Data:</strong> We automatically collect information about how you interact with our app, such as features used and session duration, to help us improve the user experience.</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <ul>
            <li>To provide and maintain the FiscalFlow service.</li>
            <li>To personalize your experience and provide AI-driven insights.</li>
            <li>To process your transactions and track your financial goals.</li>
            <li>To communicate with you about your account, updates, and security alerts.</li>
            <li>To improve the application and develop new features.</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            Security is our top priority. We implement a variety of measures to protect your data:
          </p>
          <ul>
            <li><strong>Firestore Security Rules:</strong> Our database is protected by strict rules that ensure you can only ever access your own data. No user can access another user's information.</li>
            <li><strong>Encryption:</strong> All data is encrypted in transit and at rest using industry-standard protocols.</li>
            <li><strong>Secure Authentication:</strong> We use Firebase Authentication, a secure and robust system, to manage user logins.</li>
          </ul>

          <h2>5. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information at any time. You can manage most of your data directly within the application. For complete account deletion, please contact our support team.
          </p>

          <h2>6. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by sending an email or through an in-app notification.
          </p>
          
          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at <a href="mailto:support@fiscalflow.app">support@fiscalflow.app</a>.
          </p>
        </div>
      </main>
    </div>
  );
}
