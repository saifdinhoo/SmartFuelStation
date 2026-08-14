import type { ReactNode } from 'react';

// Placeholder shell. Real header/sidebar/nav for provider & admin layouts
// will be added when those features are built.
export function MainLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground">{children}</div>;
}
