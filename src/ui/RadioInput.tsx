import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";

interface RadioInputProps {
  label: string;
  name: string;
  id: string;
  value: string;
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  validationSchema?: Record<string, any>;
}

function RadioInput({
  label,
  name,
  id,
  value,
  register,
  watch,
  validationSchema,
}: RadioInputProps) {
  return (
    <div className="flex items-center gap-x-2 text-secondary-600">
      <input
        className="cursor-pointer w-4 h-4 form-radio"
        type="radio"
        id={id}
        value={value}
        checked={watch(name) === value}
        {...register(name, validationSchema)}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export default RadioInput;
