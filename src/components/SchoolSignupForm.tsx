"use client";

import { createSchoolSignup } from "@/lib/actions/school.actions";
import { useActionState } from "react";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

type SignupState = {
  success: boolean;
  message: string;
};

type SchoolFieldKey =
  | "schoolName"
  | "contactEmail"
  | "contactPhone"
  | "country"
  | "city"
  | "address";

type AdminFieldKey = "adminName" | "adminUsername" | "adminPassword";

const initialState: SignupState = {
  success: false,
  message: "",
};

const SchoolSignupForm = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [schoolFieldErrors, setSchoolFieldErrors] = useState<
    Partial<Record<SchoolFieldKey, string>>
  >({});
  const [adminFieldErrors, setAdminFieldErrors] = useState<
    Partial<Record<AdminFieldKey, string>>
  >({});
  const [schoolForm, setSchoolForm] = useState({
    schoolName: "",
    registrationNumber: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    city: "",
    website: "",
    address: "",
  });

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

  const validateSchoolStep = () => {
    const nextErrors: Partial<Record<SchoolFieldKey, string>> = {};

    if (!schoolForm.schoolName.trim()) {
      nextErrors.schoolName = "School name is required.";
      return nextErrors;
    }
    if (!schoolForm.contactEmail.trim()) {
      nextErrors.contactEmail = "School email is required.";
      return nextErrors;
    }
    if (!schoolForm.contactPhone.trim()) {
      nextErrors.contactPhone = "School phone is required.";
      return nextErrors;
    }
    if (!schoolForm.country.trim()) {
      nextErrors.country = "Country is required.";
      return nextErrors;
    }
    if (!schoolForm.city.trim()) {
      nextErrors.city = "City is required.";
      return nextErrors;
    }
    if (!schoolForm.address.trim()) {
      nextErrors.address = "School address is required.";
      return nextErrors;
    }

    return nextErrors;
  };

  const validateAdminStep = (formData: FormData) => {
    const nextErrors: Partial<Record<AdminFieldKey, string>> = {};
    const adminName = String(formData.get("adminName") ?? "").trim();
    const adminUsername = String(formData.get("adminUsername") ?? "").trim();
    const adminPassword = String(formData.get("adminPassword") ?? "").trim();

    if (!adminName) {
      nextErrors.adminName = "Admin full name is required.";
      return nextErrors;
    }
    if (!adminUsername) {
      nextErrors.adminUsername = "Admin username is required.";
      return nextErrors;
    }
    if (!adminPassword) {
      nextErrors.adminPassword = "Admin password is required.";
      return nextErrors;
    }

    return nextErrors;
  };

  const goToAdminStep = () => {
    const nextErrors = validateSchoolStep();
    setSchoolFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep(2);
  };

  return (
    <div className="w-full h-full">
      {state.success ? (
        <div className="flex flex-col space-y-4 h-full">
          <h2 className="font-semibold text-2xl">School Access Status</h2>
          <p className="text-gray-700 text-sm leading-6">
            Your school is pending approval. Academix team will review your
            request and activate your account once verification is complete.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex bg-academixPurpleDark px-4 py-2 rounded-md text-white text-sm"
          >
            Go to sign-in
          </Link>
        </div>
      ) : (
        <form
          action={formAction}
          onSubmit={(e) => {
            const formData = new FormData(e.currentTarget);
            const schoolErrors = validateSchoolStep();
            const adminErrors = validateAdminStep(formData);

            setSchoolFieldErrors(schoolErrors);
            setAdminFieldErrors(adminErrors);

            if (
              Object.keys(schoolErrors).length > 0 ||
              Object.keys(adminErrors).length > 0
            ) {
              e.preventDefault();
              setStep(Object.keys(schoolErrors).length > 0 ? 1 : 2);
            }
          }}
          className="relative flex flex-col space-y-6 h-full"
        >
          <div>
            <h1 className="font-bold text-2xl">Create School Account</h1>
            <p className="mt-2 text-gray-600 text-sm">
              Fill in complete school and primary admin details.
            </p>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className={`rounded-full w-12 h-1.5 transition-colors ${
                step === 1
                  ? "bg-academixPurpleDark"
                  : "border border-gray-300 bg-transparent"
              }`}
            >
              <span className="sr-only">Step 1</span>
            </button>
            <button
              type="button"
              className={`rounded-full w-12 h-1.5 transition-colors ${
                step === 2
                  ? "bg-academixPurpleDark"
                  : "border border-gray-300 bg-transparent"
              }`}
            >
              <span className="sr-only">Step 2</span>
            </button>
          </div>

          {step === 1 && (
            <div className="flex flex-col flex-1 space-y-4 pb-20">
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                School Information
              </h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-1">
                  <input
                    name="schoolName"
                    placeholder="School Name"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.schoolName}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        schoolName: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.schoolName && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.schoolName}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="registrationNumber"
                    placeholder="Registration Number"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.registrationNumber}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        registrationNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <input
                    name="contactEmail"
                    type="email"
                    placeholder="School Email"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.contactEmail}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.contactEmail && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.contactEmail}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="contactPhone"
                    placeholder="School Phone"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.contactPhone}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.contactPhone && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.contactPhone}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="country"
                    placeholder="Country"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.country}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.country && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.country}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="city"
                    placeholder="City"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.city}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.city && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.city}
                    </p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <input
                    name="website"
                    type="url"
                    placeholder="Website"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    value={schoolForm.website}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        website: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <textarea
                    name="address"
                    placeholder="School Address"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                    rows={3}
                    value={schoolForm.address}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.address && (
                    <p className="text-red-600 text-xs">
                      {schoolFieldErrors.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="right-0 bottom-5 absolute">
                <button
                  type="button"
                  onClick={goToAdminStep}
                  className="text-academixPurpleDark hover:underline transition"
                >
                  <ArrowRight />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col flex-1 space-y-4 pb-20">
              <input
                type="hidden"
                name="schoolName"
                value={schoolForm.schoolName}
              />
              <input
                type="hidden"
                name="registrationNumber"
                value={schoolForm.registrationNumber}
              />
              <input
                type="hidden"
                name="contactEmail"
                value={schoolForm.contactEmail}
              />
              <input
                type="hidden"
                name="contactPhone"
                value={schoolForm.contactPhone}
              />
              <input type="hidden" name="country" value={schoolForm.country} />
              <input type="hidden" name="city" value={schoolForm.city} />
              <input type="hidden" name="website" value={schoolForm.website} />
              <input type="hidden" name="address" value={schoolForm.address} />
              <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                Primary Admin Account
              </h3>
              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-1">
                  <input
                    name="adminName"
                    placeholder="Admin Full Name"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                  />
                  {adminFieldErrors.adminName && (
                    <p className="text-red-600 text-xs">{adminFieldErrors.adminName}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="adminEmail"
                    type="email"
                    placeholder="Admin Email (Optional)"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    name="adminUsername"
                    placeholder="Admin Username"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                  />
                  {adminFieldErrors.adminUsername && (
                    <p className="text-red-600 text-xs">{adminFieldErrors.adminUsername}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <input
                    name="adminPassword"
                    type="password"
                    placeholder="Admin Password"
                    className="focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
                  />
                  {adminFieldErrors.adminPassword && (
                    <p className="text-red-600 text-xs">{adminFieldErrors.adminPassword}</p>
                  )}
                </div>
              </div>
              {state.message && (
                <p className="text-red-600 text-sm">{state.message}</p>
              )}

              <div className="right-0 bottom-0 left-0 absolute bg-white/95 py-3 min-h-[64px]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="top-1/2 left-0 absolute text-academixPurpleDark hover:underline transition -translate-y-1/2"
                >
                  <ArrowLeft />
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="top-1/2 right-0 absolute bg-academixPurpleDark disabled:opacity-70 px-6 py-2.5 rounded-md text-white -translate-y-1/2"
                >
                  {pending ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default SchoolSignupForm;
