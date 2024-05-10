import { useState } from "react";
import TextField from "../../ui/TextField";

function SendOTPForm() {
  const [phoneNumber, setPhoneNumber] = useState("");

  return (
    <>
      <form className="space-y-8">
        <TextField
          name="phoneNumber"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          label="شماره موبایل"
        />
        <button className="btn btn--primary w-full">ارسال کد تایید</button>
      </form>
    </>
  );
}

export default SendOTPForm;
