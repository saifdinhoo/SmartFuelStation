import { useNavigate } from 'react-router-dom';
import { Wrench, CalendarCheck, Building2, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const actions = [
  { label: 'Manage Services', path: '/provider/services', icon: Wrench },
  { label: 'View Bookings', path: '/provider/bookings', icon: CalendarCheck },
  { label: 'Business Profile', path: '/provider/profile', icon: Building2 },
  { label: 'View Analytics', path: '/provider/analytics', icon: BarChart3 },
];

export function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-heading-3">Quick Actions</h2>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button key={action.path} variant="secondary" onClick={() => navigate(action.path)}>
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
