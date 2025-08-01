
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Target,
  Settings,
  CircleHelp,
  LogOut,
  CalendarDays,
  PiggyBank,
  Landmark,
  Briefcase,
  Sparkles,
  CheckSquare,
} from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useTranslation } from '@/contexts/translation-context';

const menuItems = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard },
  { href: '/dashboard/transactions', labelKey: 'sidebar.transactions', icon: Wallet },
  { href: '/dashboard/checklists', labelKey: 'sidebar.checklists', icon: CheckSquare },
  { href: '/dashboard/budgets', labelKey: 'sidebar.budgets', icon: Target },
  { href: '/dashboard/savings', labelKey: 'sidebar.savings', icon: PiggyBank, premium: true },
  { href: '/dashboard/investments', labelKey: 'sidebar.investments', icon: Briefcase, premium: true },
  { href: '/dashboard/reports', labelKey: 'sidebar.reports', icon: FileText, premium: true },
  { href: '/dashboard/tax', labelKey: 'sidebar.tax', icon: Landmark, premium: true },
  { href: '/dashboard/calendar', labelKey: 'sidebar.calendar', icon: CalendarDays },
  { href: '/dashboard/settings', labelKey: 'sidebar.settings', icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout, isPremium } = useAppContext();
  const router = useRouter();
  const { t } = useTranslation();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  }

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Wallet className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-headline text-xl font-bold text-primary">FiscalFlow</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {!isPremium && (
          <div className="px-2 pb-2">
            <Button asChild className="w-full justify-start text-base font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
              <Link href="/dashboard/upgrade">
                <Sparkles className="mr-2 h-5 w-5" />
                <span>{t('sidebar.upgrade')}</span>
              </Link>
            </Button>
          </div>
        )}
        <SidebarMenu>
          {menuItems.map((item) => {
            const isItemPremium = item.premium ?? false;
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')}
                  tooltip={{ children: t(item.labelKey) }}
                  disabled={isItemPremium && !isPremium}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{t(item.labelKey)}</span>
                     {(isItemPremium && !isPremium) && (
                        <Sparkles className="ml-auto h-4 w-4 text-amber-500" />
                     )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter className="p-2">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={{children: t('sidebar.help')}}>
                  <a href="mailto:support@fiscalflow.app">
                    <CircleHelp />
                    <span>{t('sidebar.help')}</span>
                  </a>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip={{children: t('sidebar.logout')}}>
                    <LogOut />
                    <span>{t('sidebar.logout')}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar>
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || "User"} data-ai-hint="profile avatar" />
            <AvatarFallback>{user?.email?.[0].toUpperCase() || 'U'}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
                <p className="truncate font-semibold">{user?.displayName || 'User'}</p>
                {isPremium && (
                    <Badge className="bg-amber-500 text-white px-1.5 py-0 text-xs">{t('sidebar.premiumBadge')}</Badge>
                )}
            </div>
            <p className="truncate text-xs text-muted-foreground">{user?.email || 'user@email.com'}</p>
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
