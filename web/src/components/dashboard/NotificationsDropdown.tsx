import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bell } from 'lucide-react';

export interface NotificationData {
  id: string;
  title: string;
  time: string;
  read: boolean;
}

interface NotificationsDropdownProps {
  notifications: NotificationData[];
}

export function NotificationsDropdown({ notifications }: NotificationsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const unreadCount = notifications.filter((n) => !n.read).length;

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
            className="absolute end-0 z-20 mt-2 w-72 rounded-md border border-border bg-card shadow-[var(--shadow-md)]"
          >
            <div className="border-b border-border px-4 py-2 text-sm font-medium">
              Notifications
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">You&apos;re all caught up.</p>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex items-start gap-2 border-b border-border px-4 py-2.5 text-sm last:border-0"
                  >
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        notification.read ? 'bg-transparent' : 'bg-primary'
                      }`}
                    />
                    <div>
                      <p className="text-foreground">{notification.title}</p>
                      <p className="text-caption">{notification.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
