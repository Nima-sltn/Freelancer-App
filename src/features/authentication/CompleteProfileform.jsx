import { useState } from "react";
import TextField from "./../../ui/TextField";

function CompleteProfileform() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <div
      className="flex justify-center pt-20
    ">
      <div className="w-full sm:max-w-sm">
        <form className="space-y-8">
          <TextField
            label={"نام و نام خانوادگی"}
            name={"name"}
            onChange={(e) => setName(e.target.value)}
            value={name}
          />
          <TextField
            label={"ایمیل"}
            name={"email"}
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <div className="flex items-center justify-center gap-x-8">
            <div className="flex items-center gap-x-2 text-secondary-600">
              <input
                className="cursor-pointer w-4 h-4 form-radio"
                type="radio"
                name="role"
                id="OWNER"
                value="OWNER"
              />
              <label htmlFor="OWNER">کارفرما</label>
            </div>
            <div className="flex items-center gap-x-2 text-secondary-600">
              <input
                className="cursor-pointer w-4 h-4 form-radio"
                type="radio"
                name="role"
                id="FREELANCER"
                value="FREELANCER"
              />
              <label htmlFor="FREELANCER">فریلنسر</label>
            </div>
          </div>
          <button className="btn btn--primary w-full">تایید</button>
        </form>
      </div>
    </div>
  );
}

export default CompleteProfileform;
