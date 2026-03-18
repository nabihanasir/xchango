
import { Search, Filter } from 'lucide-react';

interface SearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filter: string) => void;
  filterOptions: { label: string; value: string }[];
  placeholder?: string;
}

export default function SearchFilter({ onSearch, onFilterChange, filterOptions, placeholder = "Search..." }: SearchFilterProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-body-text opacity-40" />
        <input
          type="text"
          placeholder={placeholder}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-light-color/50 bg-white focus:outline-none focus:border-dark-blue/20 transition-all font-medium text-dark-blue placeholder:text-body-text placeholder:opacity-40"
        />
      </div>
      <div className="relative min-w-[180px]">
        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-body-text opacity-40" />
        <select
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full pl-11 pr-8 py-3 rounded-xl border border-light-color/50 bg-white focus:outline-none focus:border-dark-blue/20 transition-all font-medium text-dark-blue appearance-none cursor-pointer"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 border-l border-light-color/50 h-5 md:block hidden"></div>
      </div>
    </div>
  );
}
