import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '@/features/notifications/types';

interface NotificationsDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  role: string;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
}

// Only deep-link to routes that actually exist for the current role —
// otherwise the notification is shown as plain text with no navigation.
// There is no booking-detail route for ADMIN and no single-complaint
// route at all (AdminComplaintsPage is a list with inline actions), so
// those cases fall through to null on purpose.
function notificationTarget(notification: Notification, role: string): string | null {
  if (notification.relatedBookingId) {
    if (role === 'CUSTOMER') return `/customer/bookings/${notification.relatedBookingId}`;
    if (role === 'PROVIDER') return `/provider/bookings/${notification.relatedBookingId}`;
  }
  return null;
}

export function NotificationsDropdown({
  notifications,
  unreadCount,
  role,
  onMarkRead,
  onMarkAllRead,
}: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleItemClick(notification: Notification) {
    if (!notification.isRead) onMarkRead(notification.id);
    const target = notificationTarget(notification, role);
    if (target) {
      setOpen(false);
      navigate(target);
    }
  }

  const preview = notifications.slice(0, 6);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            className="absolute end-0 z-20 mt-2 w-80 rounded-md border border-border bg-card shadow-[var(--shadow-md)]"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-2">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  className="flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>
            {preview.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {preview.map((notification) => (
                  <li key={notification.id} className="border-b border-border last:border-0">
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-start text-sm hover:bg-muted"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                          notification.isRead ? 'bg-transparent' : 'bg-primary'
                        }`}
                      />
                      <div>
                        <p className="text-foreground">{notification.title}</p>
                        <p className="text-caption line-clamp-2">{notification.message}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-border px-4 py-2 text-center text-caption text-primary hover:underline"
            >
              See all
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
