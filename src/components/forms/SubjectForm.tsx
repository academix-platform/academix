"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import { SubjectSchema, subjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const SubjectForm = ({
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
  const defaultTeacherIds =
    data?.teachers?.map((teacher: { id: string }) => teacher.id) ?? [];
  const [teacherSearch, setTeacherSearch] = useState("");

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: data?.name ?? "",
      teachers: defaultTeacherIds,
    },
  });

  const selectedTeachers =
    useWatch({
      control,
      name: "teachers",
    }) ?? [];
  const filteredTeacherOptions = teacherOptions.filter(
    (teacher: { name: string }) =>
      teacher.name.toLowerCase().includes(teacherSearch.trim().toLowerCase()),
  );

  const action = type === "create" ? createSubject : updateSubject;

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
        `${type === "create" ? "Subject created" : "Subject updated"} successfully!`,
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new subject" : "Update the subject"}
      </h1>
      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}
      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Subject Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors?.name}
        />
        <div className="flex flex-col gap-3 w-full md:w-3/5">
          <div className="flex justify-between items-end gap-4">
            <div>
              <label className="text-gray-500 text-xs">Teachers</label>
              <p className="text-[11px] text-gray-400">
                Choose one or more teachers who will be assigned to this
                subject.
              </p>
            </div>
            <span className="bg-slate-100 px-3 py-1 rounded-full font-medium text-[11px] text-gray-600 text-center">
              {selectedTeachers.length} selected
            </span>
          </div>
          <div className="relative">
            <input
              type="search"
              value={teacherSearch}
              onChange={(event) => setTeacherSearch(event.target.value)}
              placeholder="Search teachers..."
              aria-label="Search teachers"
              className="bg-white px-4 py-2 pr-10 border border-gray-200 focus:border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 w-full text-sm"
            />
            {teacherSearch && (
              <button
                type="button"
                onClick={() => setTeacherSearch("")}
                className="top-1/2 right-3 absolute text-gray-400 hover:text-gray-600 -translate-y-1/2"
                aria-label="Clear teacher search"
              >
                ×
              </button>
            )}
          </div>
          <div className="gap-3 grid sm:grid-cols-2 xl:grid-cols-3 pr-1 max-h-72 overflow-y-auto">
            {filteredTeacherOptions.length > 0 ? (
              filteredTeacherOptions.map(
                (teacher: { id: string; name: string }) => {
                  const isSelected = selectedTeachers.includes(teacher.id);

                  return (
                    <label
                      key={teacher.id}
                      className={`group flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition-all ${isSelected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-blue-200 hover:bg-slate-50"}`}
                    >
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {teacher.name}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        value={teacher.id}
                        {...register("teachers")}
                        className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-600"
                      />
                    </label>
                  );
                },
              )
            ) : (
              <div className="bg-gray-50 px-4 py-6 border border-gray-300 border-dashed rounded-xl text-gray-500 text-sm">
                {teacherOptions.length > 0
                  ? "No teachers match your search."
                  : "No teachers are available yet."}
              </div>
            )}
          </div>
          {errors.teachers?.message && (
            <p className="text-red-400 text-xs">
              {errors.teachers.message.toString()}
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

export default SubjectForm;
