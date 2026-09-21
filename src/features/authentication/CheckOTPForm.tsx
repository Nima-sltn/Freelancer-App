import { useMutation } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import OTPInput from "react-otp-input";
import { checkOtp } from "../../services/authService";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { HiArrowRight } from "react-icons/hi";
import { CiEdit } from "react-icons/ci";
import Loading from "./../../ui/Loading";
import type { OtpResponse } from "../../types";

const RESEND_TIME = 90;

interface CheckOTPFormProps {
  phoneNumber: string;
  onBack: () => void;
  onReSendOtp: (data: { phoneNumber: string }) => void;
  otpResponse: OtpResponse | undefined;
}

function CheckOTPForm({
  phoneNumber,
  onBack,
  onReSendOtp,
  otpResponse,
}: CheckOTPFormProps) {
  const [otp, setOtp] = useState("");
  const [time, setTime] = useState(RESEND_TIME);
  const navigate = useNavigate();

  const { isPending, mutateAsync } = useMutation({
    mutationFn: checkOtp,
  });

  const checkOtpHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const { user, message } = await mutateAsync({ phoneNumber, otp });
      toast.success(message);
      if (user && !user.isActive) return navigate("/complete-profile");
      if (user && Number(user.status) !== 2) {
        navigate("/");
        toast("پروفایل شما در انتظار تایید است", { icon: "👏" });
        return;
      }
      if (user?.role === "OWNER") return navigate("/owner");
      if (user?.role === "FREELANCER") return navigate("/freelancer");
      if (user?.role === "ADMIN") return navigate("/admin");
    } catch (error: any) {
      toast.error(error?.response?.data?.message);
    }
  };

  useEffect(() => {
    const timer = time > 0 && setInterval(() => setTime((t) => t - 1), 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [time]);

  return (
    <>
      <button onClick={onBack}>
        <HiArrowRight className="w-6 h-6 text-secondary-500" />
      </button>

      <form className="space-y-10" onSubmit={checkOtpHandler}>
        <p className="font-bold text-secondary-800">کد تایید را وارد کنید</p>

        <OTPInput
          value={otp}
          onChange={setOtp}
          numInputs={6}
          renderSeparator={<span>-</span>}
          renderInput={(props) => <input {...props} />}
          containerStyle="flex flex-row-reverse gap-x-2 justify-center"
          inputStyle={{
            width: "2.5rem",
            padding: "0.5rem 0.2rem",
            border: "1px solid rgb(var(--color-primary-500))",
            borderRadius: "0.5rem",
          }}
        />
        <div className="space-y-4">
          <div className="text-secondary-500 flex justify-center">
            {time > 0 ? (
              <p>{time} ثانیه تا ارسال مجدد </p>
            ) : (
              <button onClick={() => onReSendOtp({ phoneNumber })}>
                ارسال مجدد کد تایید
              </button>
            )}
          </div>
          {otpResponse && (
            <p className="flex justify-center gap-x-2">
              <span className="text-secondary-500 flex justify-center">
                {otpResponse?.message}
              </span>
              <button onClick={onBack}>
                <CiEdit className="w-6 h-6 text-primary-900" />
              </button>
            </p>
          )}
        </div>
        {isPending ? (
          <Loading />
        ) : (
          <button className="btn btn--primary w-full" type="submit">
            تایید
          </button>
        )}
      </form>
    </>
  );
}

export default CheckOTPForm;
