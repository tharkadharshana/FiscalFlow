import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function BudgetsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Budgets" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Budget Planning</CardTitle>
            <CardDescription>This is a placeholder for the budget management page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Here, users could set monthly budgets for different categories and track their spending against them.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
