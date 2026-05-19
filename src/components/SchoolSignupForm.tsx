"use client";

import { createSchoolSignup } from "@/lib/actions/school.actions";
import { useActionState } from "react";
import Link from "next/link";

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
    <>
      {state.success ? (
        <div className="space-y-4">
          <h2 className="font-semibold text-xl">School Access Status</h2>
          <p className="text-gray-700 text-sm">
            Your school is pending approval. You will recieve a respond in 2
            days.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex bg-academixPurpleDark px-4 py-2 rounded-md text-white text-sm"
          >
            Go to sign-in
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <h1 className="mb-2 font-bold text-2xl">School Signup</h1>
            <p className="mb-6 text-gray-600 text-sm">
              Register your school admin account. Your request will stay pending
              until a super admin approves it.
            </p>
          </div>
          <input
            name="schoolName"
            placeholder="School Name"
            className="p-2 border rounded-md w-full"
            required
          />
          <input
            name="adminName"
            placeholder="Admin Full Name"
            className="p-2 border rounded-md w-full"
            required
          />
          <input
            name="adminUsername"
            placeholder="Admin Username"
            className="p-2 border rounded-md w-full"
            required
          />
          <input
            name="adminPassword"
            type="password"
            placeholder="Admin Password"
            className="p-2 border rounded-md w-full"
            required
          />
          <button
            type="submit"
            disabled={pending}
            className="bg-academixPurpleDark disabled:opacity-70 px-4 py-2 rounded-md text-white"
          >
            {pending ? "Submitting..." : "Submit Request"}
          </button>
          {state.message && (
            <p className="text-red-600 text-sm">{state.message}</p>
          )}
        </form>
      )}
    </>
  );
};

export default SchoolSignupForm;
