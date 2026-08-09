import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { SERVICE_CATEGORIES } from '@/features/provider/services/types';
import { SORT_OPTIONS, type SortOption } from './types';

interface DiscoveryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  sort: SortOption;
  onSortChange: (value: SortOption) => void;
  openNowOnly: boolean;
  onOpenNowOnlyChange: (value: boolean) => void;
}

export function DiscoveryFilters({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  openNowOnly,
  onOpenNowOnlyChange,
}: DiscoveryFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="min-w-[220px] flex-1">
        <SearchInput
          label="Search"
          hideLabel
          placeholder="Search by name or service…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select
        label="Category"
        hideLabel
        className="w-full sm:w-48"
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
        options={[
          { value: 'all', label: 'All categories' },
          ...SERVICE_CATEGORIES.map((c) => ({ value: c, label: c })),
        ]}
      />
      <Select
        label="Sort"
        hideLabel
        className="w-full sm:w-44"
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        options={SORT_OPTIONS}
      />
      <Checkbox
        label="Open now"
        checked={openNowOnly}
        onChange={(e) => onOpenNowOnlyChange(e.target.checked)}
      />
    </div>
  );
}
