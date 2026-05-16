"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import { SubjectSchema, subjectSchema } from "@/lib/formValidationSchemas";
import { createSubject, updateSubject } from "@/lib/actions";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useTransition,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

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
    setValue,
    formState: { errors },
  } = useForm<SubjectSchema>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: data?.name ?? "",
      teachers: defaultTeacherIds,
      gradeId: data?.grade?.id ?? data?.gradeId ?? "",
    },
  });

  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const selectedTeachers =
    useWatch({
      control,
      name: "teachers",
    }) ?? [];
  const [filteredTeacherOptions, setFilteredTeacherOptions] = useState<
    { id: string; name: string }[]
  >([]);

  const action = type === "create" ? createSubject : updateSubject;
  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      void (async () => {
        const result = await action({ success: false, error: false }, data);

        if (result.success) {
          toast(
            `${type === "create" ? "Subject created" : "Subject updated"} successfully!`,
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      })();
    });
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".teacher-search")) {
        setShowTeacherDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
        <div className="flex flex-col gap-1 w-full md:w-1/5">
          <label className="text-gray-500 text-xs">Grade</label>
          <select
            className="bg-white px-3 py-2 border border-gray-200 rounded-xl"
            {...register("gradeId")}
            defaultValue={data?.grade?.id ?? data?.gradeId ?? ""}
          >
            <option value="">Select grade</option>
            {(relatedData?.grades ?? []).map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.level}
              </option>
            ))}
          </select>
          {errors.gradeId?.message && (
            <p className="text-red-400 text-xs">
              {errors.gradeId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 w-full md:w-3/5 teacher-search">
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
            <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-200 focus-within:border-blue-400 rounded-xl focus-within:ring-2 focus-within:ring-blue-100">
              <input
                type="search"
                value={teacherSearch}
                onChange={(event) => setTeacherSearch(event.target.value)}
                placeholder="Search teachers..."
                aria-label="Search teachers"
                className="bg-transparent outline-none w-full text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const keyword = teacherSearch.trim().toLowerCase();
                  const results = teacherOptions.filter(
                    (teacher: { id: string; name: string }) =>
                      teacher.name.toLowerCase().includes(keyword) &&
                      !selectedTeachers.includes(String(teacher.id)),
                  );
                  setFilteredTeacherOptions(results);
                  setShowTeacherDropdown(true);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Search teachers"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {showTeacherDropdown && (
              <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md max-h-56 overflow-y-auto">
                {filteredTeacherOptions.length > 0 ? (
                  filteredTeacherOptions.map(
                    (teacher: { id: string; name: string }) => (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setValue(
                            "teachers",
                            [...selectedTeachers, String(teacher.id)],
                            { shouldDirty: true, shouldValidate: true },
                          );
                          setTeacherSearch("");
                          setShowTeacherDropdown(false);
                          setFilteredTeacherOptions([]);
                        }}
                        className="hover:bg-blue-100 px-3 py-2 text-sm cursor-pointer"
                      >
                        {teacher.name}
                      </div>
                    ),
                  )
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm">
                    No teachers found
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTeachers.length > 0 ? (
              selectedTeachers.map((teacherId: string) => {
                const teacher = teacherOptions.find(
                  (option: { id: string; name: string }) =>
                    String(option.id) === teacherId,
                );

                return (
                  <div
                    key={teacherId}
                    className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm"
                  >
                    <span>{teacher?.name ?? teacherId}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setValue(
                          "teachers",
                          selectedTeachers.filter(
                            (currentId: string) => currentId !== teacherId,
                          ),
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="bg-gray-50 px-4 py-3 border border-gray-300 border-dashed rounded-xl text-gray-500 text-sm">
                No teachers selected yet.
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
      <button
        disabled={isSubmitting}
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 p-2 rounded-md text-white transition-all"
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

export default SubjectForm;
