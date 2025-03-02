import TextField from "./../../ui/TextField";
import { useMutation } from "@tanstack/react-query";
import { completeProfile } from "./../../services/authService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import RadioInputGroup from "./../../ui/RadioInputGroup";

function CompleteProfileform() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();

  const { mutateAsync } = useMutation({
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
            }}
            errors={errors}
          />
          <RadioInputGroup
            errors={errors}
            register={register}
            watch={watch}
            configs={{
              name: "role",
              validationSchema: { required: "انتخاب نقش ضروری است" },
              options: [
                { value: "OWNER", label: "کارفرما" },
                { value: "FREELANCER", label: "فریلنسر" },
              ],
            }}
          />
          <button className="btn btn--primary w-full">تایید</button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfileform;
