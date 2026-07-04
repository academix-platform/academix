"use client";

import { Dispatch, SetStateAction, startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { deleteStudent } from "@/lib/actions";
import { useTranslations } from "next-intl";

type StudentDeleteFormProps = {
  data?: { id: string; name?: string };
  relatedData?: {
    parent?: {
      id: string;
      name: string;
      _count: { students: number };
    } | null;
  };
  setOpen: Dispatch<SetStateAction<boolean>>;
};

const StudentDeleteForm = ({
  data,
  relatedData,
  setOpen,
}: StudentDeleteFormProps) => {
  const t = useTranslations("forms.studentDelete");
  const commonT = useTranslations("forms.common");
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const parent = relatedData?.parent ?? null;
  const canDeleteBoth = Boolean(parent && parent._count.students === 1);

  const handleDelete = (deleteParent: boolean) => {
    if (!data?.id || isDeleting) return;

    startTransition(() => {
      void (async () => {
        setIsDeleting(true);

        const formData = new FormData();
        formData.set("id", data.id);
        formData.set("deleteParent", deleteParent ? "true" : "false");

        const result = await deleteStudent(
          { success: false, error: false },
          formData,
        );

        setIsDeleting(false);

        if (result.success) {
          toast(
            deleteParent && parent
              ? t("studentAndParentDeleted")
              : t("studentDeleted"),
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? commonT("somethingWentWrong"));
      })();
    });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <h1 className="font-semibold text-xl text-center">{t("title")}</h1>
      <p className="text-gray-600 text-sm text-center">
        {t("confirm", { name: data?.name ?? t("fallbackName") })}
      </p>

      {parent ? (
        <div className="bg-amber-50 p-3 border border-amber-200 rounded-md text-amber-900 text-sm">
          <p>
            {t("linkedParent", { parent: parent.name })}
          </p>
          {canDeleteBoth ? (
            <p className="mt-1">{t("canDeleteBoth")}</p>
          ) : (
            <p className="mt-1">{t("parentHasMoreStudents")}</p>
          )}
        </div>
      ) : null}

      <div className="flex justify-center gap-3">
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => handleDelete(false)}
          className="bg-red-700 disabled:opacity-50 px-4 py-2 rounded-md w-max text-white"
        >
          {t("deleteStudent")}
        </button>

        {parent ? (
          <button
            type="button"
            disabled={isDeleting || !canDeleteBoth}
            onClick={() => handleDelete(true)}
            className="bg-red-400 disabled:opacity-50 px-4 py-2 rounded-md w-max text-white"
          >
            {t("deleteBoth")}
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default StudentDeleteForm;


