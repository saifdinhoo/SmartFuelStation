import { Radio } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { ProviderStatusIndicator } from '@/components/ui/ProviderStatusIndicator';

interface LiveStatusControlProps {
  isOpen: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function LiveStatusControl({ isOpen, onToggle, disabled }: LiveStatusControlProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Radio className="h-4 w-4 text-primary" />
        <h2 className="text-heading-3">Live Status</h2>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <ProviderStatusIndicator status={isOpen ? 'open' : 'closed'} />
        <Switch
          checked={isOpen}
          onChange={onToggle}
          disabled={disabled}
          label="Open for business"
        />
      </CardContent>
    </Card>
  );
}
