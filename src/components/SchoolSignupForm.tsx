"use client";

import { createSchoolSignup } from "@/lib/actions/school.actions";
import { useActionState } from "react";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

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
  const t = useTranslations("schoolSignup");
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
      nextErrors.schoolName = t("validation.schoolNameRequired");
      return nextErrors;
    }
    if (!schoolForm.contactEmail.trim()) {
      nextErrors.contactEmail = t("validation.schoolEmailRequired");
      return nextErrors;
    }
    if (!schoolForm.contactPhone.trim()) {
      nextErrors.contactPhone = t("validation.schoolPhoneRequired");
      return nextErrors;
    }
    if (!schoolForm.country.trim()) {
      nextErrors.country = t("validation.countryRequired");
      return nextErrors;
    }
    if (!schoolForm.city.trim()) {
      nextErrors.city = t("validation.cityRequired");
      return nextErrors;
    }
    if (!schoolForm.address.trim()) {
      nextErrors.address = t("validation.addressRequired");
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
      nextErrors.adminName = t("validation.adminNameRequired");
      return nextErrors;
    }
    if (!adminUsername) {
      nextErrors.adminUsername = t("validation.adminUsernameRequired");
      return nextErrors;
    }
    if (!adminPassword) {
      nextErrors.adminPassword = t("validation.adminPasswordRequired");
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
    <div className="w-full">
      {state.success ? (
        <div className="flex flex-col items-center text-center p-6 sm:p-10 space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="font-bold text-2xl text-content-primary">
            {t("statusTitle")}
          </h2>
          <p className="text-content-secondary text-sm leading-relaxed max-w-md">
            {t("statusDescription")}
          </p>
          <div className="pt-4">
            <Link href="/sign-in">
              <Button
                variant="primary"
                size="lg"
                className="font-semibold shadow-xs whitespace-nowrap"
                rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />}
              >
                {t("goToSignIn")}
              </Button>
            </Link>
          </div>
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
          className="flex flex-col space-y-6"
        >
          {/* Header & Step Tracker */}
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-2xl text-content-primary tracking-tight">
                  {t("title")}
                </h2>
                <p className="mt-1 text-content-secondary text-sm">
                  {t("description")}
                </p>
              </div>

              {/* Step indicator pills */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    step === 1
                      ? "bg-brandPurple-600 text-white shadow-xs"
                      : "bg-surface-muted text-content-muted hover:text-content-primary"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1</span>
                </button>
                <button
                  type="button"
                  onClick={goToAdminStep}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    step === 2
                      ? "bg-brandPurple-600 text-white shadow-xs"
                      : "bg-surface-muted text-content-muted hover:text-content-primary"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2</span>
                </button>
              </div>
            </div>

            {/* Visual Progress bar */}
            <div className="w-full bg-outline h-1 rounded-full mt-4 overflow-hidden">
              <div
                className="bg-brandPurple-600 h-full transition-all duration-300 rounded-full"
                style={{ width: step === 1 ? "50%" : "100%" }}
              />
            </div>
          </div>

          {step === 1 && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-outline">
                <Building2 className="w-4 h-4 text-brandPurple-600" />
                <h3 className="font-bold text-xs text-content-primary uppercase tracking-wider">
                  {t("schoolInfo")}
                </h3>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="schoolName"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.schoolName")} *
                  </label>
                  <input
                    id="schoolName"
                    name="schoolName"
                    placeholder={t("fields.schoolName")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                    value={schoolForm.schoolName}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        schoolName: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.schoolName && (
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.schoolName}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="registrationNumber"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.registrationNumber")}
                  </label>
                  <input
                    id="registrationNumber"
                    name="registrationNumber"
                    placeholder={t("fields.registrationNumber")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
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
                  <label
                    htmlFor="contactEmail"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.schoolEmail")} *
                  </label>
                  <input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    placeholder={t("fields.schoolEmail")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                    value={schoolForm.contactEmail}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        contactEmail: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.contactEmail && (
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.contactEmail}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="contactPhone"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.schoolPhone")} *
                  </label>
                  <input
                    id="contactPhone"
                    name="contactPhone"
                    placeholder={t("fields.schoolPhone")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                    value={schoolForm.contactPhone}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        contactPhone: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.contactPhone && (
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.contactPhone}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="country"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.country")} *
                  </label>
                  <input
                    id="country"
                    name="country"
                    placeholder={t("fields.country")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                    value={schoolForm.country}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        country: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.country && (
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.country}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="city"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.city")} *
                  </label>
                  <input
                    id="city"
                    name="city"
                    placeholder={t("fields.city")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                    value={schoolForm.city}
                    onChange={(e) =>
                      setSchoolForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                  />
                  {schoolFieldErrors.city && (
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.city}
                    </p>
                  )}
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label
                    htmlFor="website"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.website")}
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://yourschool.edu"
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
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
                  <label
                    htmlFor="schoolAddress"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.schoolAddress")} *
                  </label>
                  <textarea
                    id="schoolAddress"
                    name="address"
                    placeholder={t("fields.schoolAddress")}
                    className="w-full p-3.5 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted resize-none [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
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
                    <p className="text-red-500 text-xs font-medium">
                      {schoolFieldErrors.address}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  type="button"
                  onClick={goToAdminStep}
                  variant="primary"
                  size="md"
                  className="font-semibold shadow-xs whitespace-nowrap"
                  rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />}
                >
                  {t("step", { number: 2 })}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col space-y-4">
              {/* Carry forward Step 1 values */}
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

              <div className="flex items-center gap-2 pb-1 border-b border-outline">
                <ShieldCheck className="w-4 h-4 text-brandPurple-600" />
                <h3 className="font-bold text-xs text-content-primary uppercase tracking-wider">
                  {t("adminInfo")}
                </h3>
              </div>

              <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="adminName"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.adminName")} *
                  </label>
                  <input
                    id="adminName"
                    name="adminName"
                    placeholder={t("fields.adminName")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                  />
                  {adminFieldErrors.adminName && (
                    <p className="text-red-500 text-xs font-medium">
                      {adminFieldErrors.adminName}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="adminEmail"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.adminEmailOptional")}
                  </label>
                  <input
                    id="adminEmail"
                    name="adminEmail"
                    type="email"
                    placeholder={t("fields.adminEmailOptional")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="adminUsername"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.adminUsername")} *
                  </label>
                  <input
                    id="adminUsername"
                    name="adminUsername"
                    placeholder={t("fields.adminUsername")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                  />
                  {adminFieldErrors.adminUsername && (
                    <p className="text-red-500 text-xs font-medium">
                      {adminFieldErrors.adminUsername}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="adminPassword"
                    className="block text-xs font-semibold text-content-primary uppercase tracking-wider"
                  >
                    {t("fields.adminPassword")} *
                  </label>
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    placeholder={t("fields.adminPassword")}
                    className="w-full h-11 px-4 rounded-xl border border-outline bg-surface text-content-primary text-sm focus:outline-none focus:border-brandPurple-600 focus:ring-2 focus:ring-brandPurple-100 transition-all placeholder:text-content-muted [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_var(--color-surface)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:var(--color-content-primary)]"
                  />
                  {adminFieldErrors.adminPassword && (
                    <p className="text-red-500 text-xs font-medium">
                      {adminFieldErrors.adminPassword}
                    </p>
                  )}
                </div>
              </div>

              {state.message && (
                <p className="text-red-500 text-sm font-medium mt-2">
                  {state.message}
                </p>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  onClick={() => setStep(1)}
                  variant="secondary"
                  size="md"
                  className="font-medium whitespace-nowrap"
                  leftIcon={<ArrowLeft className="w-4 h-4 rtl:rotate-180 shrink-0" />}
                >
                  {t("step", { number: 1 })}
                </Button>

                <Button
                  type="submit"
                  disabled={pending}
                  variant="primary"
                  size="md"
                  className="font-semibold shadow-xs whitespace-nowrap"
                >
                  {pending ? (
                    <>
                      <span
                        className="border-2 border-white/40 border-t-white rounded-full w-4 h-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span>{t("submitting")}</span>
                    </>
                  ) : (
                    <span>{t("submit")}</span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
};

export default SchoolSignupForm;
