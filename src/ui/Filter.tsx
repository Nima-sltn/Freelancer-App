import { useSearchParams } from "react-router-dom";
import type { FilterOption } from "../types";

interface FilterProps {
  filterField: string;
  options: FilterOption[];
}

function Filter({ filterField, options }: FilterProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFilter = searchParams.get(filterField) || options.at(0)?.value;

  const handleClick = (value: string) => {
    searchParams.set(filterField, value);
    setSearchParams(searchParams);
  };

  return (
    <div className="flex items-center gap-x-2 text-xs">
      <span>وضعیت</span>
      <div className="flex items-center gap-x-2 p-1 border border-secondary-100 bg-secondary-0 rounded-lg">
        {options.map(({ value, label }) => {
          const isActive = value === currentFilter;
          return (
            <button
              key={value}
              disabled={isActive}
              onClick={() => handleClick(value)}
              className={`whitespace-nowrap rounded-md px-4 py-1 font-bold transition-all duration-300 
                ${
                  isActive
                    ? "!bg-primary-900 text-white"
                    : "bg-secondary-0 text-secondary-800"
                }`}>
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default Filter;
