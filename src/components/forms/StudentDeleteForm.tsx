"use client";

import { Dispatch, SetStateAction, startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { deleteStudent } from "@/lib/actions";

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
              ? "Student and parent deleted successfully"
              : "Student deleted successfully",
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      })();
    });
  };

  return (
    <div className="flex flex-col gap-5 p-4">
      <h1 className="font-semibold text-xl text-center">Delete student</h1>
      <p className="text-gray-600 text-sm text-center">
        Are you sure you want to delete {data?.name ?? "this student"}?
      </p>

      {parent ? (
        <div className="bg-amber-50 p-3 border border-amber-200 rounded-md text-amber-900 text-sm">
          <p>
            This student is linked to parent{" "}
            <span className="font-semibold">{parent.name}</span>.
          </p>
          {canDeleteBoth ? (
            <p className="mt-1">
              You can delete the student only, or delete both the student and
              the parent.
            </p>
          ) : (
            <p className="mt-1">
              The parent has more than one student, so only the student can be
              deleted.
            </p>
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
          Delete Student
        </button>

        {parent ? (
          <button
            type="button"
            disabled={isDeleting || !canDeleteBoth}
            onClick={() => handleDelete(true)}
            className="bg-red-400 disabled:opacity-50 px-4 py-2 rounded-md w-max text-white"
          >
            Delete both
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default StudentDeleteForm;


