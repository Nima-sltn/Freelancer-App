import type { UseFormRegister } from "react-hook-form";

interface RHFSelectProps {
  label: string;
  name: string;
  options: { value: string | number; label: string }[];
  register: UseFormRegister<any>;
  required?: boolean;
}

function RHFSelect({ label, name, options, register, required }: RHFSelectProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block text-secondary-700">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <select {...register(name)} id={name} className="textField__input">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default RHFSelect;
