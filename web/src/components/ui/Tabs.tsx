import { useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
}

export function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
    if (event.key === 'ArrowRight') {
      setActiveId(tabs[(currentIndex + 1) % tabs.length].id);
    } else if (event.key === 'ArrowLeft') {
      setActiveId(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
    }
  }

  return (
    <div>
      <div role="tablist" onKeyDown={handleKeyDown} className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={tab.id === activeId}
            tabIndex={tab.id === activeId ? 0 : -1}
            onClick={() => setActiveId(tab.id)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab.id === activeId
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="pt-4">
        {activeTab?.content}
      </div>
    </div>
  );
}
