function RadioInput({
  label,
  name,
  id,
  value,
  register,
  watch,
  validationSchema,
}) {
  return (
    <div className="flex items-center gap-x-2 text-secondary-600">
      <input
        className="cursor-pointer w-4 h-4 form-radio"
        type="radio"
        name={name}
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
