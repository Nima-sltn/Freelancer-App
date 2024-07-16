import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import useChangeUserStatus from "./useChangeUserStatus";
import RHFSelect from "../../../ui/RHFSelect";
import Loading from "../../../ui/Loading";

const options = [
  {
    label: "رد شده",
    value: 0,
  },
  {
    label: "در انتظار تایید",
    value: 1,
  },
  {
    label: "تایید شده",
    value: 2,
  },
];

function ChangeUserStatus({ userId, onClose }) {
  const { register, handleSubmit } = useForm();
  const { changeUserStatus, isUpdating } = useChangeUserStatus();
  const queryClient = useQueryClient();

  const onSubmit = (data) => {
    changeUserStatus(
      { userId, data },
      {
        onSuccess: () => {
          onClose();
          queryClient.invalidateQueries({ queryKey: ["users"] });
        },
      }
    );
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <RHFSelect
          name="status"
          label="تغییر وضعیت"
          register={register}
          required
          options={options}
        />
        {isUpdating ? (
          <Loading />
        ) : (
          <button
            className="btn btn--primary mt-8 w-2/3 -translate-x-1/4"
            type="submit">
            تایید
          </button>
        )}
      </form>
    </div>
  );
}

export default ChangeUserStatus;
