import { useSearchParams } from "react-router-dom";
import Select from "./Select";
import type { ChangeEvent } from "react";
import type { FilterOption } from "../types";

interface FilterDropDownProps {
  options: FilterOption[];
  filterField: string;
}

function FilterDropDown({ options, filterField }: FilterDropDownProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(filterField) || "";

  const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
    searchParams.set(filterField, e.target.value);
    setSearchParams(searchParams);
  };

  return <Select value={value} onChange={handleChange} options={options} />;
}

export default FilterDropDown;
