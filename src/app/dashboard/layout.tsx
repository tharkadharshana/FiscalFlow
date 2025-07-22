import { SidebarNav } from '@/components/sidebar-nav';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import { ActiveTripBanner } from '@/components/dashboard/active-trip-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <ActiveTripBanner />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
