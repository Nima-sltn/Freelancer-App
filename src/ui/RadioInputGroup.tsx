import RadioInput from "./RadioInput";
import type { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";

interface RadioGroupConfig {
  name: string;
  validationSchema?: Record<string, any>;
  options: { value: string; label: string }[];
}

interface RadioInputGroupProps {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  errors: FieldErrors;
  configs: RadioGroupConfig;
}

function RadioInputGroup({ register, watch, errors, configs }: RadioInputGroupProps) {
  const { name, validationSchema = {}, options } = configs;

  return (
    <div className="flex flex-col items-center ">
      <div className="flex items-center justify-center gap-x-8">
        {options.map((option) => (
          <RadioInput
            key={option.value}
            label={option.label}
            id={option.value}
            value={option.value}
            name={name}
            register={register}
            watch={watch}
            validationSchema={validationSchema}
          />
        ))}
      </div>
      {errors?.[name] && (
        <span className="text-error block text-sm mt-2">
          {errors[name]?.message as string}
        </span>
      )}
    </div>
  );
}

export default RadioInputGroup;
