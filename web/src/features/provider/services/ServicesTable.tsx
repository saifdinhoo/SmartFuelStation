import { Pencil, Trash2 } from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Button } from '@/components/ui/Button';
import type { Service } from './types';

interface ServicesTableProps {
  services: Service[];
  isLoading: boolean;
  onToggleAvailability: (id: string) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function ServicesTable({
  services,
  isLoading,
  onToggleAvailability,
  onEdit,
  onDelete,
}: ServicesTableProps) {
  const columns: DataTableColumn<Service>[] = [
    { key: 'name', header: 'Service', render: (row) => row.name },
    {
      key: 'category',
      header: 'Category',
      render: (row) => <Badge variant="secondary">{row.category}</Badge>,
    },
    { key: 'price', header: 'Price', render: (row) => `$${row.price.toFixed(2)}` },
    { key: 'duration', header: 'Duration', render: (row) => `${row.durationMinutes} min` },
    {
      key: 'available',
      header: 'Available',
      render: (row) => (
        <Switch
          checked={row.available}
          onChange={() => onToggleAvailability(row.id)}
          label={`Toggle availability for ${row.name}`}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onEdit(row)}
            aria-label={`Edit ${row.name}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onDelete(row)}
            aria-label={`Delete ${row.name}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="hidden md:block">
      <DataTable
        columns={columns}
        rows={services}
        getRowKey={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="No services match your filters."
      />
    </div>
  );
}
