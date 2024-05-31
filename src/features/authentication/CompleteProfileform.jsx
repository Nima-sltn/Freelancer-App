import TextField from "./../../ui/TextField";
import RadioInput from "../../ui/RadioInput";
import { useMutation } from "@tanstack/react-query";
import { completeProfile } from "./../../services/authService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";

function CompleteProfileform() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();

  const { mutateAsync, isPending } = useMutation({
    mutationFn: completeProfile,
  });

  const onSubmit = async (data) => {
    try {
      const { message, user } = await mutateAsync(data);
      toast.success(message);
      if (user.status !== 2) {
        navigate("/");
        toast("پروفایل شما در انتظار تایید است", { icon: "⭐" });
        return;
      }
      if (user.role === "OWNER") return navigate("/owner");
      if (user.role === "FREELANCER") return navigate("/freelancer");
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  return (
    <div className="flex flex-col gap-y-6 items-center pt-20">
      <h1 className="font-bold text-3xl text-secondary-700">تکمیل اطلاعات</h1>
      <div className="w-full sm:max-w-sm">
        <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
          <TextField
            label={"نام و نام خانوادگی"}
            name={"name"}
            register={register}
            validationSchema={{ required: "نام و نام خانوادگی ضروری است" }}
            errors={errors}
          />
          <TextField
            label={"ایمیل"}
            name={"email"}
            register={register}
            validationSchema={{
              required: "ایمیل ضروری است",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "ایمیل نامعتبر است",
              },
            }}
            errors={errors}
          />
          <div className="flex flex-col items-center ">
            <div className="flex items-center justify-center gap-x-8">
              <RadioInput
                label="کارفرما"
                name="role"
                id="OWNER"
                value="OWNER"
                register={register}
                watch={watch}
                validationSchema={{ required: "انتخاب نقش ضروری است" }}
                errors={errors}
              />
              <RadioInput
                label="فریلنسر"
                name="role"
                id="FREELANCER"
                value="FREELANCER"
                register={register}
                watch={watch}
                validationSchema={{ required: "انتخاب نقش ضروری است" }}
                errors={errors}
              />
            </div>
            {errors && errors["role"] && (
              <span className="text-error block text-sm mt-2">
                {errors["role"]?.message}
              </span>
            )}
          </div>
          <button className="btn btn--primary w-full">تایید</button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfileform;
