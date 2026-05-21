"use client";

import { createNotification } from "@/lib/actions/notification";
import { getSchoolId } from "@/lib/getSchoolId";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dispatch, SetStateAction, useMemo, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createEvent, updateEvent } from "@/lib/actions";
import { eventSchema } from "@/lib/formValidationSchemas";
import InputField from "../InputField";

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

type EventFormValues = {
  id?: number;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  classIds: number[];
};

const EventForm = ({
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
  const startDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.startDate);
  const endDefaultValue =
    type === "create" ? nowDefault : toDatetimeLocalValue(data?.endDate);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      id: data?.id,
      title: data?.title,
      description: data?.description,
      startDate: startDefaultValue,
      endDate: endDefaultValue,
      classIds:
        data?.classes?.map((classItem: { id: number }) => classItem.id) ?? [],
    },
  });

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((formValues) => {
    const action = type === "create" ? createEvent : updateEvent;
    const parsed = eventSchema.parse(formValues);

    startTransition(async () => {
      try {
        const result = await action({ success: false, error: false }, parsed);
        
        if (result.success) {
          if (type === "create") {
            try {
              const schoolId = await getSchoolId();
              
              // لتجنب استدعاء قاعدة البيانات مباشرة في الـ Client Component،
              // نعتمد على استجابة الـ Action الراجع (result.students) أو معالجة الإشعارات بالخلفية
              const studentIds: string[] = result.students ?? [];

              for (const studentId of studentIds) {
                await createNotification({
                  schoolId,
                  recipientType: "STUDENT",
                  recipientId: String(studentId),
                  type: "EVENT",
                  title: "New Event",
                  message: `A new event "${formValues.title}" has been scheduled.`,
                  relatedId: Number(result.id ?? formValues.id ?? 0),
                });
              }
            } catch (error) {
              console.error("Notification error:", error);
            }
          }

          toast(`Event has been ${type === "create" ? "created" : "updated"}!`);
          setOpen(false);
          router.refresh();
          return;
        }
        
        toast.error(result.message ?? "Something went wrong!");
      } catch (err) {
        toast.error("Something went wrong!");
      }
    });
  });

  const classes = useMemo(() => relatedData?.classes ?? [], [relatedData]);
  const watchedClassIds = useWatch({ control, name: "classIds" });
  const classIdsRegister = register("classIds");

  const selectedClassIdsAsNumbers = useMemo(
    () =>
      ((watchedClassIds ?? []) as Array<string | number>)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id)),
    [watchedClassIds],
  );

  const classIds = useMemo<number[]>(
    () => classes.map((cls: { id: number; name: string }) => cls.id),
    [classes],
  );

  const areAllSelected =
    classIds.length > 0 &&
    classIds.every((id: number) => selectedClassIdsAsNumbers.includes(id));

  const toggleAllClasses = (checked: boolean) => {
    const selectedSet = new Set<number>(selectedClassIdsAsNumbers);

    if (checked) {
      for (const classId of classIds) {
        selectedSet.add(classId);
      }
    } else {
      for (const classId of classIds) {
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

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create" ? "Create a new event" : "Update the event"}
      </h1>

      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          label="Event Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
          inputProps={{ placeholder: "e.g. Sports Day" }}
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

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Classes</label>
          <div className="flex flex-col gap-2 p-3 rounded-md ring-[1.5px] ring-gray-300 max-h-[220px] overflow-y-auto">
            <label className="flex items-center gap-2 mb-4 text-gray-700 text-sm">
              <input
                type="checkbox"
                checked={areAllSelected}
                onChange={(e) => toggleAllClasses(e.target.checked)}
                disabled={classIds.length === 0}
                className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
              />
              <span className="font-medium">Select all</span>
            </label>
            {classes.map((cls: { id: number; name: string }) => (
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
          </div>
          {selectedClassIdsAsNumbers.length > 0 && (
            <p className="text-gray-400 text-xs">
              {selectedClassIdsAsNumbers.length} class
              {selectedClassIdsAsNumbers.length === 1 ? " is" : "es are"}{" "}
              selected
            </p>
          )}
          {errors.classIds?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.classIds.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Description</label>
          <textarea
            {...register("description")}
            defaultValue={data?.description}
            rows={4}
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
            placeholder="Event description"
          />
          {errors.description?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.description.message.toString()}
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

export default EventForm;
