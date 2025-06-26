import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function TransactionsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Transactions" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
            <CardDescription>This is a placeholder for the transactions list.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>A full list or table of all user transactions would be displayed here, with sorting and filtering options.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
