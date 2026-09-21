import type { FieldErrors, UseFormRegister } from "react-hook-form";

interface TextFieldProps {
  label?: string;
  name: string;
  register: UseFormRegister<any>;
  validationSchema?: Record<string, any>;
  type?: string;
  required?: boolean;
  errors?: FieldErrors;
}

function TextField({
  label,
  name,
  register,
  validationSchema,
  type = "text",
  required,
  errors,
}: TextFieldProps) {
  return (
    <div>
      <label className="mb-1 block text-secondary-700" htmlFor={name}>
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        {...register(name, validationSchema)}
        id={name}
        className="textField__input"
        type={type}
        autoComplete="off"
      />
      {errors && errors[name] && (
        <span className="text-error block text-sm mt-2">
          {errors[name]?.message as string}
        </span>
      )}
    </div>
  );
}

export default TextField;
