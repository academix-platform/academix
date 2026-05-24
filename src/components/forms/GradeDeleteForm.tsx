"use client";

import { Dispatch, SetStateAction, useState, useTransition } from "react";
import { deleteGrade } from "@/lib/actions/grade.actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

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
          toast.success("Grade deleted successfully!");
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message ?? "Something went wrong!");
        }
      })();
    });
  };

  return (
    <form onSubmit={handleDelete} className="flex flex-col gap-4 p-4">

      <h1 className="font-bold text-gray-900 text-2xl">Delete grade</h1>

      {classCount > 0 ? (
        <div className="bg-red-50 p-3 border border-red-200 rounded-md text-sm">
          <p className="font-medium text-red-700">
            Warning: This grade has {classCount} class{classCount === 1 ? "" : "es"} attached.
          </p>
          <p className="mt-1 text-red-600">
            Deleting this grade will also delete those classes and their schedule-related records.
          </p>
          {relatedData?.classes && relatedData.classes.length > 0 && (
            <p className="mt-2 text-red-700">
              Classes: {relatedData.classes.map((item) => item.name).join(", ")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-gray-600 text-sm">
          Grade {data.level} has no classes attached and can be deleted.
        </p>
      )}

      <p className="font-medium text-center">
        Are you sure you want to delete Grade {data.level}?
      </p>

      {state.error && (
        <p className="text-red-500 text-sm">
          {state.message ?? "Something went wrong!"}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => setOpen(false)}
          className="hover:bg-gray-50 disabled:opacity-60 px-4 py-2 border border-gray-300 rounded-md text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-700 disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md text-white text-sm transition-all"
        >
          {isSubmitting ? "Deleting..." : "Delete grade"}
        </button>
      </div>
    </form>
  );
};

export default GradeDeleteForm;
