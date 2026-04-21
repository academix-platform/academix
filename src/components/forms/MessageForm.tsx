"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dispatch, SetStateAction, useMemo, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createMessage, updateMessage } from "@/lib/actions";
import { messageSchema, MessageSchema } from "@/lib/formValidationSchemas";
import InputField from "../InputField";
import MessageClassSelector from "./message/MessageClassSelector";
import RecipientPicker from "./message/RecipientPicker";

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

const EMPTY_STRING_ARRAY: string[] = [];
const EMPTY_CLASS_ARRAY: Array<string | number> = [];

const MessageForm = ({
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
  const nowDefault = toDatetimeLocalValue(new Date());
  const dateDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.date);
  const dateSchemaDefault =
    data?.date instanceof Date
      ? data.date
      : data?.date
        ? new Date(data.date)
        : new Date();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<MessageSchema>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title,
      description: data?.description,
      date: dateDefaultValue as any,
      classIds:
        data?.classes?.map((classItem: { id: number }) => classItem.id) ?? [],
      studentIds:
        data?.students?.map((studentItem: { id: string }) => studentItem.id) ??
        [],
      parentIds:
        data?.parents?.map((parentItem: { id: string }) => parentItem.id) ?? [],
      teacherIds:
        data?.teachers?.map((teacherItem: { id: string }) => teacherItem.id) ??
        [],
    },
  });

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((formValues: MessageSchema) => {
    const action = type === "create" ? createMessage : updateMessage;

    startTransition(async () => {
      try {
        const result = await action(
          { success: false, error: false },
          formValues,
        );

        if (result.success) {
          toast(
            `Message has been ${type === "create" ? "created" : "updated"}!`,
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

  const classes = useMemo(() => relatedData?.classes ?? [], [relatedData]);
  const students = useMemo(() => relatedData?.students ?? [], [relatedData]);
  const parents = useMemo(() => relatedData?.parents ?? [], [relatedData]);
  const teachers = useMemo(() => relatedData?.teachers ?? [], [relatedData]);

  const watchedClassIds =
    useWatch({
      control,
      name: "classIds",
    }) ?? EMPTY_CLASS_ARRAY;

  const selectedClassIds = useMemo(
    () => watchedClassIds as Array<string | number>,
    [watchedClassIds],
  );

  const selectedStudentIds =
    useWatch({
      control,
      name: "studentIds",
    }) ?? EMPTY_STRING_ARRAY;
  const selectedParentIds =
    useWatch({
      control,
      name: "parentIds",
    }) ?? EMPTY_STRING_ARRAY;
  const selectedTeacherIds =
    useWatch({
      control,
      name: "teacherIds",
    }) ?? EMPTY_STRING_ARRAY;

  const selectedClassIdsAsNumbers = useMemo(
    () =>
      (selectedClassIds as Array<string | number>)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id)),
    [selectedClassIds],
  );

  const eligibleStudents = useMemo(() => {
    if (selectedClassIdsAsNumbers.length === 0) return students;
    return students.filter((student: { classId?: number }) =>
      selectedClassIdsAsNumbers.includes(Number(student.classId)),
    );
  }, [selectedClassIdsAsNumbers, students]);

  const eligibleParents = useMemo(() => {
    if (selectedClassIdsAsNumbers.length === 0) return parents;
    return parents.filter(
      (parent: { students?: Array<{ classId?: number }> }) =>
        parent.students?.some((student) =>
          selectedClassIdsAsNumbers.includes(Number(student.classId)),
        ),
    );
  }, [parents, selectedClassIdsAsNumbers]);

  const eligibleTeachers = useMemo(() => {
    if (selectedClassIdsAsNumbers.length === 0) return teachers;
    return teachers.filter((teacher: { classes?: Array<{ id: number }> }) =>
      teacher.classes?.some((classItem) =>
        selectedClassIdsAsNumbers.includes(Number(classItem.id)),
      ),
    );
  }, [selectedClassIdsAsNumbers, teachers]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new message" : "Update the message"}
      </h1>

      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}

      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Message Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
          inputProps={{ placeholder: "e.g. Reminder" }}
        />

        <InputField
          label="Date"
          name="date"
          type="datetime-local"
          defaultValue={dateDefaultValue}
          register={register}
          error={errors?.date}
        />

        <input type="hidden" {...register("classIds")} />
        <MessageClassSelector
          classes={classes}
          selectedClassIds={selectedClassIdsAsNumbers}
          onChange={(nextClassIds) =>
            setValue("classIds", nextClassIds, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <RecipientPicker
          label="Student recipients"
          items={eligibleStudents}
          selectedIds={selectedStudentIds}
          onChange={(nextIds) =>
            setValue("studentIds", nextIds, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <RecipientPicker
          label="Parent recipients"
          items={eligibleParents}
          selectedIds={selectedParentIds}
          onChange={(nextIds) =>
            setValue("parentIds", nextIds, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <RecipientPicker
          label="Teacher recipients"
          items={eligibleTeachers}
          selectedIds={selectedTeacherIds}
          onChange={(nextIds) =>
            setValue("teacherIds", nextIds, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />

        <div className="flex flex-col gap-2 w-full">
          <label className="text-gray-500 text-xs">Description</label>
          <textarea
            {...register("description")}
            defaultValue={data?.description}
            rows={4}
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            placeholder="Message details"
          />
          {errors.description?.message && (
            <p className="text-red-400 text-xs">
              {errors.description.message.toString()}
            </p>
          )}
          {errors.studentIds?.message && (
            <p className="text-red-400 text-xs">
              {errors.studentIds.message.toString()}
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

export default MessageForm;
