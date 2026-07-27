import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { Input } from './Input';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ label, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        label={label}
        type="search"
        startAdornment={<Search className="h-4 w-4" />}
        {...props}
      />
    );
  },
);
SearchInput.displayName = 'SearchInput';
