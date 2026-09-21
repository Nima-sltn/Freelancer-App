import type { ChangeEvent } from "react";

interface SelectProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}

function Select({ value, onChange, options }: SelectProps) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="textField__input py-2 text-xs bg-secondary-0">
      {options.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}

export default Select;
