import { useState } from "react";
import TextField from "../../ui/TextField";
import { useMutation } from "@tanstack/react-query";
import { getOtp } from "./../../services/authService";
import toast from "react-hot-toast";
import Loading from "../../ui/Loading";

function SendOTPForm({ setStep }) {
  const [phoneNumber, setPhoneNumber] = useState("");

  const { isPending, error, data, mutateAsync } = useMutation({
    mutationFn: getOtp,
  });

  const sendOtpHandler = async (e) => {
    e.preventDefault();
    try {
      const data = await mutateAsync({ phoneNumber });
      setStep(2);
      toast.success(data.message);
    } catch (error) {
      toast.error(error?.response?.data?.message);
    }
  };

  return (
    <>
      <form className="space-y-8" onSubmit={sendOtpHandler}>
        <TextField
          name="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          label="شماره موبایل"
        />
        {isPending ? (
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
