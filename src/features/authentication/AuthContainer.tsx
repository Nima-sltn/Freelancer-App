import { useState } from "react";
import SendOTPForm from "./SendOTPForm";
import CheckOTPForm from "./CheckOTPForm";
import { useMutation } from "@tanstack/react-query";
import { getOtp } from "../../services/authService";
import toast from "react-hot-toast";
import { useForm } from "react-hook-form";
import useUser from "./useUser";
import { useNavigate } from "react-router-dom";
import type { OtpResponse } from "../../types";

function AuthContainer() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { register, handleSubmit, getValues } = useForm<any>();
  const { user } = useUser();

  const {
    isPending: isSendingOtp,
    mutateAsync,
    data: otpResponse,
  } = useMutation({
    mutationFn: getOtp,
  });

  const sendOtpHandler = async (data: { phoneNumber: string }) => {
    try {
      const { message } = await mutateAsync(data);
      setStep(2);
      toast.success(message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <SendOTPForm
            onSubmit={handleSubmit(sendOtpHandler)}
            isSendingOtp={isSendingOtp}
            register={register}
          />
        );
      case 2:
        return (
          <CheckOTPForm
            otpResponse={otpResponse as OtpResponse | undefined}
            onReSendOtp={sendOtpHandler}
            phoneNumber={getValues("phoneNumber")}
            onBack={() => setStep((s) => s - 1)}
          />
        );
      default:
        return null;
    }
  };

  return <div className="w-full sm:max-w-sm">{renderStep()}</div>;
}

export default AuthContainer;
