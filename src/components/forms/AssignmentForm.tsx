"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import {
  assignmentSchema,
  AssignmentSchema,
} from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import { Dispatch, SetStateAction, useMemo, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const toDatetimeLocalValue = (value: unknown) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const AssignmentForm = ({
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
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      subjectId: data?.subjectId,
      classIds: data?.classId ? [data.classId] : [],
    },
  });

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((formValues) => {
    const action = type === "create" ? createAssignment : updateAssignment;

    startTransition(async () => {
      try {
        const result = await action(
          { success: false, error: false },
          formValues,
        );

        if (result.success) {
          toast(
            `Assignment has been ${type === "create" ? "created" : "updated"}!`,
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      } catch {
        toast.error("Something went wrong!");
      }
    });
  });

  const { subjects = [], classes = [], lessons = [] } = relatedData ?? {};
  const selectedSubjectId = useWatch({ control, name: "subjectId" });
  const selectedClassIds = useWatch({ control, name: "classIds" }) ?? [];
  const selectedSubjectIdNumber = Number(selectedSubjectId);

  const availableClassIds = useMemo(() => {
    if (!selectedSubjectId || Number.isNaN(selectedSubjectIdNumber)) {
      return new Set<number>();
    }

    return new Set<number>(
      lessons
        .filter((lesson: { subjectId: number; classId: number }) => {
          return lesson.subjectId === selectedSubjectIdNumber;
        })
        .map(
          (lesson: { subjectId: number; classId: number }) => lesson.classId,
        ),
    );
  }, [lessons, selectedSubjectId, selectedSubjectIdNumber]);

  const filteredClasses =
    selectedSubjectId && !Number.isNaN(selectedSubjectIdNumber)
      ? classes.filter((cls: { id: number; name: string }) =>
          availableClassIds.has(cls.id),
        )
      : classes;

  const nowDefault = toDatetimeLocalValue(new Date());
  const startDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.startDate);
  const endDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.endDate);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create"
          ? "Create a new assignment"
          : "Update the assignment"}
      </h1>

      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Assignment Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
          inputProps={{ placeholder: "e.g. Chapter 4 Homework" }}
        />
        <InputField
          label="Start Date"
          name="startDate"
          type="datetime-local"
          defaultValue={startDefaultValue}
          register={register}
          error={errors?.startDate}
        />
        <InputField
          label="End Date"
          name="endDate"
          type="datetime-local"
          defaultValue={endDefaultValue}
          register={register}
          error={errors?.endDate}
        />
        {type === "update" && (
          <input type="hidden" {...register("id")} defaultValue={data?.id} />
        )}

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Subject</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            {...register("subjectId")}
            defaultValue={data?.subjectId}
          >
            <option value="">Select subject</option>
            {subjects.map((subject: { id: number; name: string }) => (
              <option value={subject.id} key={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
          {errors.subjectId?.message && (
            <p className="text-red-400 text-xs">
              {errors.subjectId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-gray-500 text-xs">Classes</label>
          <div className="flex flex-col gap-2 p-3 rounded-md ring-[1.5px] ring-gray-300 max-h-[220px] overflow-y-auto">
            {filteredClasses.map((cls: { id: number; name: string }) => (
              <label
                key={cls.id}
                className="flex items-center gap-2 text-gray-700 text-sm"
              >
                <input
                  type="checkbox"
                  value={cls.id}
                  defaultChecked={
                    data?.classId ? data.classId === cls.id : false
                  }
                  {...register("classIds")}
                  className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
                />
                <span>{cls.name}</span>
              </label>
            ))}
          </div>
          {selectedClassIds.length > 0 && (
            <p className="text-gray-400 text-xs">
              {selectedClassIds.length} class
              {selectedClassIds.length === 1 ? " is" : "es are"} selected
            </p>
          )}
          {errors.classIds?.message && (
            <p className="text-red-400 text-xs">
              {errors.classIds.message.toString()}
            </p>
          )}
        </div>
      </div>
      <button
        className="bg-blue-400 disabled:opacity-60 p-2 rounded-md text-white"
        disabled={isSubmitting}
      >
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AssignmentForm;
