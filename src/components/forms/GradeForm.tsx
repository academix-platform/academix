"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { gradeSchema, GradeSchema } from "@/lib/formValidationSchemas";
import { createGrade } from "@/lib/actions";
import { Dispatch, SetStateAction, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import InputField from "../InputField";

const GradeForm = ({
  setOpen,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GradeSchema>({
    resolver: zodResolver(gradeSchema),
    defaultValues: {
      level: undefined,
    },
  });

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      void (async () => {
        const result = await createGrade({ success: false, error: false }, formData);

        if (result.success) {
          toast("Grade created successfully!");
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      })();
    });
  });

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">Create a new grade</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          label="Grade Level"
          name="level"
          type="number"
          register={register}
          error={errors?.level}
          inputProps={{ min: 1 }}
        />
      </div>

      <button
        disabled={isSubmitting}
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
      >
        {isSubmitting ? "Submitting..." : "Create"}
      </button>
    </form>
  );
};

export default GradeForm;
