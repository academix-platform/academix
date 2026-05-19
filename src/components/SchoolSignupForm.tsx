"use client";

import { createSchoolSignup } from "@/lib/actions/school.actions";
import { useActionState } from "react";

type SignupState = {
  success: boolean;
  message: string;
};

const initialState: SignupState = {
  success: false,
  message: "",
};

const SchoolSignupForm = () => {
  const [state, formAction, pending] = useActionState(
    async (_prevState: SignupState, formData: FormData) => {
      const result = await createSchoolSignup(formData);
      return {
        success: result.success,
        message: result.message,
      };
    },
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input name="schoolName" placeholder="School Name" className="p-2 border rounded-md w-full" required />
      <input name="adminName" placeholder="Admin Full Name" className="p-2 border rounded-md w-full" required />
      <input name="adminUsername" placeholder="Admin Username" className="p-2 border rounded-md w-full" required />
      <input name="adminPassword" type="password" placeholder="Admin Password" className="p-2 border rounded-md w-full" required />
      <button
        type="submit"
        disabled={pending}
        className="bg-academixPurpleDark disabled:opacity-70 px-4 py-2 rounded-md text-white"
      >
        {pending ? "Submitting..." : "Submit Request"}
      </button>
      {state.message && (
        <p className={state.success ? "text-green-700 text-sm" : "text-red-600 text-sm"}>
          {state.message}
        </p>
      )}
    </form>
  );
};

export default SchoolSignupForm;
