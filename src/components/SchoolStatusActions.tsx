"use client";

import { type FormEvent, useState } from "react";
import { updateSchoolStatus } from "@/lib/actions/school.actions";
import { SchoolStatus } from "@prisma/client";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  schoolId: number;
  schoolName: string;
  schoolStatus: SchoolStatus;
};

const ModalShell = ({
  title,
  closeLabel,
  children,
  onClose,
}: {
  title: string;
  closeLabel: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div
    className="z-50 fixed inset-0 flex justify-center items-center bg-black/40 p-4"
    onClick={onClose}
  >
    <div
      className="bg-white p-4 rounded-lg w-full max-w-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-base">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
          aria-label={closeLabel}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const SchoolStatusActions = ({ schoolId, schoolName, schoolStatus }: Props) => {
  const t = useTranslations("schoolStatus");
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const router = useRouter();

  const onActivateClick = () => {
    if (schoolStatus === "ACTIVE") {
      toast.info(t("alreadyActive"));
      return;
    }
    setShowActivateConfirm(true);
  };

  const onPauseClick = () => {
    if (schoolStatus === "PAUSED") {
      toast.info(t("alreadyPaused"));
      return;
    }
    setShowPauseConfirm(true);
  };

  const submitActivate = async () => {
    const formData = new FormData();
    formData.set("schoolId", String(schoolId));
    formData.set("status", "ACTIVE");

    try {
      setIsActivating(true);
      await updateSchoolStatus(formData);
      setShowActivateConfirm(false);
      toast.success(t("activated"));
      router.refresh();
    } catch {
      toast.error(t("activateFailed"));
    } finally {
      setIsActivating(false);
    }
  };

  const submitPause = async (formData: FormData) => {
    if (isPausing) return;

    const reason = String(formData.get("pauseReason") ?? "").trim();
    if (!reason) {
      toast.error(t("pauseReasonRequired"));
      return;
    }

    formData.set("schoolId", String(schoolId));
    formData.set("status", "PAUSED");

    try {
      setIsPausing(true);
      await updateSchoolStatus(formData);
      setShowPauseConfirm(false);
      toast.success(t("paused"));
      router.refresh();
    } catch {
      toast.error(t("pauseFailed"));
    } finally {
      setIsPausing(false);
    }
  };

  const onPauseSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await submitPause(formData);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 py-2">
        <button
          type="button"
          onClick={onActivateClick}
          className="bg-green-600 px-2 py-1 rounded text-white text-xs hover:scale-[1.05] transition"
        >
          {t("activate")}
        </button>
        <button
          type="button"
          onClick={onPauseClick}
          className="bg-red-600 px-2 py-1 rounded text-white text-xs hover:scale-[1.05] transition"
        >
          {t("pause")}
        </button>
      </div>

      {showActivateConfirm && (
        <ModalShell
          title={t("confirmActivation")}
          closeLabel={t("closeModal")}
          onClose={() => setShowActivateConfirm(false)}
        >
          <p className="mb-4 text-gray-700 text-sm">
            {t("activateConfirm", { name: schoolName })}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowActivateConfirm(false)}
              className="px-3 py-1.5 border rounded text-sm"
            >
              {t("cancel")}
            </button>
            <button
              className="bg-green-600 px-3 py-1.5 rounded text-white text-sm"
              type="button"
              onClick={submitActivate}
              disabled={isActivating}
            >
              {isActivating ? t("activating") : t("confirm")}
            </button>
          </div>
        </ModalShell>
      )}

      {showPauseConfirm && (
        <ModalShell
          title={t("confirmPause")}
          closeLabel={t("closeModal")}
          onClose={() => setShowPauseConfirm(false)}
        >
          <form onSubmit={onPauseSubmit} className="space-y-3">
            <p className="text-gray-700 text-sm">
              {t("pauseConfirm", { name: schoolName })}
            </p>
            <textarea
              name="pauseReason"
              required
              placeholder={t("pauseReason")}
              className="p-2 border rounded w-full text-sm"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPauseConfirm(false)}
                className="px-3 py-1.5 border rounded text-sm"
              >
                {t("cancel")}
              </button>
              <button
                className="bg-red-600 px-3 py-1.5 rounded text-white text-sm"
                type="submit"
                disabled={isPausing}
              >
                {isPausing ? t("pausing") : t("confirm")}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
};

export default SchoolStatusActions;
