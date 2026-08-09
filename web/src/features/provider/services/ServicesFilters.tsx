import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { SERVICE_CATEGORIES } from './types';
import type { AvailabilityFilter } from './useProviderServices';

interface ServicesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityChange: (value: AvailabilityFilter) => void;
}

const categoryOptions = [
  { value: 'all', label: 'All categories' },
  ...SERVICE_CATEGORIES.map((category) => ({ value: category, label: category })),
];

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
}: ServicesFiltersProps) {
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
