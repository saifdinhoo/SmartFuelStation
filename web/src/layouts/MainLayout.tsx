import type { ReactNode } from 'react';

// Placeholder shell. Real header/sidebar/nav for provider & admin layouts
// will be added when those features are built.
export function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {children}
    </div>
  );
}
