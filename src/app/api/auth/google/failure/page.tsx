import { XCircle } from 'lucide-react';

export default function GmailFailurePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
            <XCircle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
            <p className="text-muted-foreground">Something went wrong while connecting your Gmail account.</p>
            <p className="mt-4 text-sm">Please try again. You can close this tab.</p>
        </div>
    );
}
