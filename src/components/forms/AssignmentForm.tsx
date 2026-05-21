"use client";

import { createNotification } from "@/lib/actions/notification";
import { getSchoolId } from "@/lib/getSchoolId";
import prisma from "@/lib/prisma";

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
    setValue,
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
           ///////////
 if (result.success) {

  if (type === "create") {
    try {
      const schoolId = await getSchoolId(); 

      const students = await prisma.student.findMany({
        where: {
          classId: {
            in: formValues.classIds.map(Number),
          },
        },
        select: { id: true },
      });

      for (const student of students) {
        await createNotification({
          schoolId,
          recipientType: "STUDENT",
          recipientId: student.id,
          type: "ASSIGNMENT",
          title: "New Assignment",
          message: A new assignment "${formValues.title}" has been posted.,
          relatedId: Number(formValues.subjectId ?? 0),
        });
      }
    } catch (error) {
      console.error("Notification error:", error);
    }
  }

  toast(Assignment has been ${type === "create" ? "created" : "updated"}!);
  setOpen(false);
  router.refresh();
  return;
}
        //////////////
        toast.error(result.message ?? "Something went wrong!");
      } catch {
        toast.error("Something went wrong!");
      }
    });
  });

  const { subjects = [], classes = [], lessons = [] } = relatedData ?? {};
  const selectedSubjectId = useWatch({ control, name: "subjectId" });
  const watchedClassIds = useWatch({ control, name: "classIds" });
  const classIdsRegister = register("classIds");
  const selectedClassIds = useMemo(
    () => (watchedClassIds ?? []) as Array<string | number>,
    [watchedClassIds],
  );
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

  const selectedClassIdsAsNumbers = useMemo(
    () =>
      (selectedClassIds as Array<string | number>)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id)),
    [selectedClassIds],
  );

  const filteredClassIds = useMemo<number[]>(
    () => filteredClasses.map((cls: { id: number; name: string }) => cls.id),
    [filteredClasses],
  );

  const areAllFilteredSelected =
    filteredClassIds.length > 0 &&
    filteredClassIds.every((id) => selectedClassIdsAsNumbers.includes(id));

  const toggleAllFilteredClasses = (checked: boolean) => {
    const selectedSet = new Set<number>(selectedClassIdsAsNumbers);

    if (checked) {
      for (const classId of filteredClassIds) {
        selectedSet.add(classId);
      }
    } else {
      for (const classId of filteredClassIds) {
        selectedSet.delete(classId);
      }
    }

    setValue("classIds", Array.from(selectedSet), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleSingleClass = (classId: number, checked: boolean) => {
    const selectedSet = new Set<number>(selectedClassIdsAsNumbers);

    if (checked) {
      selectedSet.add(classId);
    } else {
      selectedSet.delete(classId);
    }

    setValue("classIds", Array.from(selectedSet), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const nowDefault = toDatetimeLocalValue(new Date());
  const startDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.startDate);
  const endDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.endDate);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create"
          ? "Create a new assignment"
          : "Update the assignment"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Subject</label>
          <select
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
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
            <p className="font-medium text-red-500 text-xs">
              {errors.subjectId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Classes</label>
          <div className="flex flex-col gap-2 p-3 rounded-md ring-[1.5px] ring-gray-300 max-h-[220px] overflow-y-auto">
            <label className="flex items-center gap-2 mb-4 text-gray-700 text-sm">
              <input
                type="checkbox"
                checked={areAllFilteredSelected}
                onChange={(e) => toggleAllFilteredClasses(e.target.checked)}
                disabled={filteredClassIds.length === 0}
                className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
              />
              <span className="font-medium">Select all</span>
            </label>
            {filteredClasses.map((cls: { id: number; name: string }) => (
              <label
                key={cls.id}
                className="flex items-center gap-2 text-gray-700 text-sm"
              >
                <input
                  {...classIdsRegister}
                  type="checkbox"
                  value={cls.id}
                  checked={selectedClassIdsAsNumbers.includes(cls.id)}
                  onChange={(e) => toggleSingleClass(cls.id, e.target.checked)}
                  className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
                />
                <span>{cls.name}</span>
              </label>
            ))}
            {filteredClasses.length === 0 && (
              <p className="text-gray-400 text-xs">No classes available.</p>
            )}
          </div>
          {selectedClassIds.length > 0 && (
            <p className="text-gray-400 text-xs">
              {selectedClassIds.length} class
              {selectedClassIds.length === 1 ? " is" : "es are"} selected
            </p>
          )}
          {errors.classIds?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.classIds.message.toString()}
            </p>
          )}
        </div>
      </div>
      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? "Submitting..."
          : type === "create"
            ? "Create"
            : "Update"}
      </button>
    </form>
  );
};

export default AssignmentForm;
