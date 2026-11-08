import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Clock, AlertTriangle, XCircle, Sparkles, Info, CalendarCheck, CalendarX, Hourglass, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp, type AppNotification, type NotificationType } from '@/lib/store';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  subscription_expired: XCircle,
  subscription_expiring: AlertTriangle,
  welcome: Sparkles,
  booking_confirmed: CalendarCheck,
  booking_cancelled: CalendarX,
  booking_reminder: Clock,
  waitlist_joined: Hourglass,
  waitlist_promoted: PartyPopper,
  lesson_cancelled: CalendarX,
  admin_message: Bell,
  info: Info,
};

const TYPE_COLORS: Record<NotificationType, string> = {
  subscription_expired: 'text-red-400 bg-red-500/10 border-red-500/20',
  subscription_expiring: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  welcome: 'text-primary bg-primary/10 border-primary/20',
  booking_confirmed: 'text-green-400 bg-green-500/10 border-green-500/20',
  booking_cancelled: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  booking_reminder: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  waitlist_joined: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  waitlist_promoted: 'text-green-400 bg-green-500/10 border-green-500/20',
  lesson_cancelled: 'text-red-400 bg-red-500/10 border-red-500/20',
  admin_message: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  info: 'text-muted-foreground bg-white/5 border-white/10',
};

function formatRelative(dateStr: string, now: number): string {
  const d = new Date(dateStr);
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return 'adesso';
  if (diffMin < 60) return `${diffMin} min fa`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} or${diffH === 1 ? 'a' : 'e'} fa`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD} giorn${diffD === 1 ? 'o' : 'i'} fa`;
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const {
    user,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearReadNotifications,
  } = useApp();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  // Re-render relative timestamps while the panel is open
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, [open]);

  const handleClickNotif = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id);
    if (n.link) {
      setOpen(false);
      setLocation(n.link);
    }
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          data-testid="notifications-bell"
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-primary transition-colors"
          aria-label={unreadCount > 0 ? `Notifiche (${unreadCount} non lette)` : 'Notifiche'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              data-testid="notifications-unread-badge"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-bold flex items-center justify-center border-2 border-background"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0 bg-card/95 backdrop-blur-xl border-white/10"
        data-testid="notifications-panel"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <h3 className="font-display uppercase italic text-base font-bold">Notifiche</h3>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} non lett${unreadCount === 1 ? 'a' : 'e'}` : 'Tutto in regola'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-primary hover:text-primary/80"
              onClick={markAllNotificationsRead}
              data-testid="notifications-mark-all-read"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Segna tutte
            </Button>
          )}
        </div>

        {/* max-h must sit on the Radix viewport, not on the root, or the list never scrolls */}
        <ScrollArea className="[&>[data-radix-scroll-area-viewport]]:max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-12 text-center" data-testid="notifications-empty">
              <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nessuna notifica al momento</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Ti avviseremo qui per scadenze e novità.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] || Info;
                const colorCls = TYPE_COLORS[n.type] || TYPE_COLORS.info;
                return (
                  <li
                    key={n.id}
                    data-testid={`notification-item-${n.id}`}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      'group relative px-4 py-3 cursor-pointer hover:bg-white/[0.03] focus-visible:bg-white/[0.05] outline-none transition-colors',
                      !n.read && 'bg-primary/[0.04]'
                    )}
                    onClick={() => handleClickNotif(n)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClickNotif(n);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'shrink-0 h-9 w-9 rounded-full flex items-center justify-center border',
                          colorCls
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              'text-sm font-medium truncate',
                              !n.read ? 'text-white' : 'text-muted-foreground'
                            )}
                          >
                            {n.title}
                          </p>
                          {!n.read && (
                            <span className="shrink-0 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mt-1">
                          {formatRelative(n.createdAt, now)}
                        </p>
                      </div>
                    </div>
                    {/* Visible on hover, on keyboard focus, and always on touch devices */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                      {!n.read && (
                        <button
                          className="h-6 w-6 rounded hover:bg-white/10 flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                          }}
                          aria-label="Segna come letta"
                          data-testid={`notification-read-${n.id}`}
                        >
                          <Check className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        className="h-6 w-6 rounded hover:bg-red-500/10 hover:text-red-400 flex items-center justify-center text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        aria-label="Elimina"
                        data-testid={`notification-delete-${n.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {notifications.some((n) => n.read) && (
          <div className="px-4 py-2 border-t border-white/10">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-xs text-muted-foreground hover:text-red-400"
              onClick={clearReadNotifications}
              data-testid="notifications-clear-read"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Cancella notifiche lette
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
