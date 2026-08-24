import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import type { AvailabilityFilter } from './useProviderServices';

interface ServicesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityChange: (value: AvailabilityFilter) => void;
  categories: { id: number; name: string }[];
}

const availabilityOptions = [
  { value: 'all', label: 'All availability' },
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
];

export function ServicesFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  availabilityFilter,
  onAvailabilityChange,
  categories,
}: ServicesFiltersProps) {
  // Real categories from the database, not a hardcoded list.
  const categoryOptions = [
    { value: 'all', label: 'All categories' },
    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <SearchInput
        label="Search services"
        hideLabel
        placeholder="Search services…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select
        label="Category"
        hideLabel
        options={categoryOptions}
        value={categoryFilter}
        onChange={(e) => onCategoryChange(e.target.value)}
      />
      <Select
        label="Availability"
        hideLabel
        options={availabilityOptions}
        value={availabilityFilter}
        onChange={(e) => onAvailabilityChange(e.target.value as AvailabilityFilter)}
      />
    </div>
  );
}
