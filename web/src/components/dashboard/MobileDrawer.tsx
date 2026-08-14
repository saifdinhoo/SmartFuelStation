import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Wrench, X } from 'lucide-react';
import type { NavItem } from '@/features/dashboard/navigation';
import { useDirection } from '@/app/providers/DirectionProvider';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export function MobileDrawer({ open, onClose, navItems }: MobileDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const { dir } = useDirection();
  // The drawer is positioned at the logical "start" edge (left in LTR,
  // right in RTL). Framer Motion's x transform is physical, so the
  // off-screen direction has to be flipped to match.
  const hiddenX = dir === 'rtl' ? '100%' : '-100%';

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: shouldReduceMotion ? 0 : hiddenX }}
            animate={{ x: 0 }}
            exit={{ x: shouldReduceMotion ? 0 : hiddenX }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25 }}
            className="absolute inset-y-0 start-0 flex w-72 flex-col bg-card"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Smart Automotive</span>
              </div>
              <button type="button" onClick={onClose} aria-label="Close menu">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
