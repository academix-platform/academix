"use client";

import { Dispatch, SetStateAction, useState, useTransition } from "react";
import { deleteGrade } from "@/lib/actions/grade.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

type GradeDeleteFormProps = {
  data: {
    id: number;
    level: number;
    _count?: {
      classes?: number;
    };
  };
  relatedData?: {
    classes?: Array<{
      id: number;
      name: string;
    }>;
  };
  setOpen: Dispatch<SetStateAction<boolean>>;
};

type FormState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const GradeDeleteForm = ({ data, relatedData, setOpen }: GradeDeleteFormProps) => {
  const t = useTranslations("forms.gradeDelete");
  const commonT = useTranslations("forms.common");
  const actionsT = useTranslations("actions");
  const router = useRouter();
  const [state, setState] = useState<FormState>({ success: false, error: false });
  const [isSubmitting, startTransition] = useTransition();

  const classCount = data?._count?.classes ?? 0;

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setState({ success: false, error: false });

    const payload = new FormData();
    payload.set("id", String(data.id));

    startTransition(() => {
      void (async () => {
        const result = await deleteGrade({ success: false, error: false }, payload);
        setState(result);

        if (result.success) {
          toast.success(t("deleted"));
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message ?? commonT("somethingWentWrong"));
        }
      })();
    });
  };

  return (
    <form onSubmit={handleDelete} className="flex flex-col gap-4 p-4">

      <h1 className="font-bold text-gray-900 text-2xl">{t("title")}</h1>

      {classCount > 0 ? (
        <div className="bg-red-50 p-3 border border-red-200 rounded-md text-sm">
          <p className="font-medium text-red-700">
            {t("warning", { count: classCount })}
          </p>
          <p className="mt-1 text-red-600">
            {t("cascadeWarning")}
          </p>
          {relatedData?.classes && relatedData.classes.length > 0 && (
            <p className="mt-2 text-red-700">
              {t("classes", {
                classes: relatedData.classes.map((item) => item.name).join(", "),
              })}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">
          {t("noClasses", { level: data.level })}
        </p>
      )}

      <p className="font-medium text-center">
        {t("confirm", { level: data.level })}
      </p>

      {state.error && (
        <p className="text-red-500 text-sm">
          {state.message ?? commonT("somethingWentWrong")}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setOpen(false)}
          className="hover:bg-gray-50 disabled:opacity-60 px-4 py-2 border border-gray-300 rounded-md text-sm"
        >
          {actionsT("close")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-700 disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md text-white text-sm transition-all"
        >
          {isSubmitting ? actionsT("deleting") : t("delete")}
        </button>
      </div>
    </form>
  );
};

export default GradeDeleteForm;
