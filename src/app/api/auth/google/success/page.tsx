import { CheckCircle } from 'lucide-react';

export default function GmailSuccessPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Success!</h1>
            <p className="text-muted-foreground">Your Gmail account has been connected.</p>
            <p className="mt-4 text-sm">You can now close this tab and return to the FiscalFlow app.</p>
        </div>
    );
}
