import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Reports" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>This is a placeholder for the reports generation page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Users would be able to generate and export their financial reports in PDF or CSV format from this page.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
