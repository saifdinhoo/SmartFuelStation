import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

// Wraps a single route's page element. Used with AnimatePresence in
// AppRoutes so navigating between pages gets a subtle fade instead of an
// abrupt swap.
export function PageTransition({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
