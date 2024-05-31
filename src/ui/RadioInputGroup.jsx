import RadioInput from "./RadioInput";

function RadioInputGroup({ register, watch, errors, configs }) {
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
            errors={errors}
          />
        ))}
      </div>
      {errors && errors[name] && (
        <span className="text-error block text-sm mt-2">
          {errors[name]?.message}
        </span>
      )}
    </div>
  );
}

export default RadioInputGroup;
