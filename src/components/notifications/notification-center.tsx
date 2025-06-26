
'use client';

import { useAppContext } from '@/contexts/app-context';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Bell, CheckCircle, Info, XCircle, AlertTriangle, CheckCheck } from 'lucide-react';

const iconMap = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
}

export function NotificationCenter() {
  const { notifications, markAllNotificationsAsRead } = useAppContext();

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
        <Button variant="ghost" size="sm" onClick={markAllNotificationsAsRead} disabled={notifications.every(n => n.isRead)}>
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
        </Button>
      </div>
      <ScrollArea className="h-80">
        {notifications.length > 0 ? (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'flex items-start gap-3 p-4',
                  !notification.isRead && 'bg-primary/5'
                )}
              >
                <div className="mt-1">{iconMap[notification.type]}</div>
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
            <Bell className="h-10 w-10 mb-4" />
            <p className="font-semibold">No notifications yet</p>
            <p className="text-sm">We'll let you know when something important happens.</p>
          </div>
        )}
      </ScrollArea>
      <div className="p-2 border-t text-center">
        <Button variant="link" size="sm" className="text-muted-foreground">
          View all notifications
        </Button>
      </div>
    </div>
  );
}
