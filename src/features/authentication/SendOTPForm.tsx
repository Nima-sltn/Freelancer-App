import TextField from "../../ui/TextField";
import Loading from "../../ui/Loading";
import type { UseFormRegister } from "react-hook-form";
import type { FormEvent } from "react";

interface SendOTPFormProps {
  isSendingOtp: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  register: UseFormRegister<any>;
}

function SendOTPForm({ isSendingOtp, onSubmit, register }: SendOTPFormProps) {
  return (
    <>
      <form className="space-y-8" onSubmit={onSubmit}>
        <TextField
          name="phoneNumber"
          register={register}
          label="شماره موبایل"
        />
        {isSendingOtp ? (
          <Loading />
        ) : (
          <button className="btn btn--primary w-full" type="submit">
            ارسال کد تایید
          </button>
        )}
      </form>
    </>
  );
}

export default SendOTPForm;
