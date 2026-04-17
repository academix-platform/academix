"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import { ClassSchema, classSchema } from "@/lib/formValidationSchemas";
import { createClass, updateClass } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const ClassForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const teacherOptions = relatedData?.teachers ?? [];
  const gradeOptions = relatedData?.grades ?? [];
  const defaultGradeId = data?.gradeId ?? data?.grade?.id ?? "";
  const defaultSupervisorId = data?.supervisorId ?? data?.supervisor?.id ?? "";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClassSchema>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: data?.name ?? "",
      capacity: data?.capacity,
      gradeId: defaultGradeId,
      supervisorId: defaultSupervisorId,
    },
  });

  const action = type === "create" ? createClass : updateClass;

  const [state, formAction] = useActionState(action, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });

  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      toast(
        `${type === "create" ? "Class created" : "Class updated"} successfully!`,
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new class" : "Update the class"}
      </h1>
      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}
      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Class Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <InputField
          label="Capacity"
          name="capacity"
          defaultValue={data?.capacity}
          register={register}
          error={errors?.capacity}
        />
        <div className="flex flex-col gap-2 w-full md:w-3/5">
          <label className="text-gray-500 text-xs" htmlFor="gradeId">
            Grade
          </label>
          <select
            id="gradeId"
            {...register("gradeId")}
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            defaultValue={defaultGradeId}
          >
            <option value="">Select a grade</option>
            {gradeOptions.map((grade: { id: number; level: number }) => (
              <option
                key={grade.id}
                value={grade.id}
                defaultValue={data && grade.id === data.gradeId}
              >
                Grade {grade.level}
              </option>
            ))}
          </select>
          {errors.gradeId?.message && (
            <p className="text-red-400 text-xs">
              {errors.gradeId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-3/5">
          <label className="text-gray-500 text-xs" htmlFor="supervisorId">
            Supervisor
          </label>
          <select
            id="supervisorId"
            {...register("supervisorId")}
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            defaultValue={defaultSupervisorId}
          >
            <option value="">Select a teacher</option>
            {teacherOptions.map((teacher: { id: string; name: string }) => (
              <option
                key={teacher.id}
                value={teacher.id}
                defaultValue={data && teacher.id === data.supervisorId}
              >
                {teacher.name}
              </option>
            ))}
          </select>
          {errors.supervisorId?.message && (
            <p className="text-red-400 text-xs">
              {errors.supervisorId.message.toString()}
            </p>
          )}
        </div>
      </div>
      {state.error && (
        <span className="text-red-500">Something went wrong!</span>
      )}
      <button className="bg-blue-400 p-2 rounded-md text-white">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ClassForm;
