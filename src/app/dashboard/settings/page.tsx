import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Header title="Settings" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Application Settings</CardTitle>
            <CardDescription>This is a placeholder for the settings page.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This page would contain options for users to manage their profile, set currency, toggle dark mode, and configure notification preferences.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
