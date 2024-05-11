import TextField from "../../ui/TextField";

import Loading from "../../ui/Loading";

function SendOTPForm({ isSendingOtp, phoneNumber, onChange, onSubmit }) {
  return (
    <>
      <form className="space-y-8" onSubmit={onSubmit}>
        <TextField
          name="phoneNumber"
          value={phoneNumber}
          onChange={onChange}
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
