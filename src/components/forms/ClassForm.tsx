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
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

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
    setValue,
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
  const [searchInput, setSearchInput] = useState(
    teacherOptions.find(
      (teacher: { id: string; name: string }) =>
        String(teacher.id) === String(defaultSupervisorId),
    )?.name ?? "",
  );
  const [selectedSupervisorId, setSelectedSupervisorId] =
    useState<string>(defaultSupervisorId);
  const [showSupervisorDropdown, setShowSupervisorDropdown] = useState(false);
  const [filteredTeachers, setFilteredTeachers] = useState<
    { id: string; name: string }[]
  >([]);

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      void (async () => {
        const result = await action({ success: false, error: false }, data);

        if (result.success) {
          toast(
            `${type === "create" ? "Class created" : "Class updated"} successfully!`,
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      })();
    });
  });

  const router = useRouter();

  useEffect(() => {
    setValue("supervisorId", selectedSupervisorId);
  }, [selectedSupervisorId, setValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".supervisor-search")) {
        setShowSupervisorDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

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
        <div className="flex flex-col gap-2 w-full md:w-3/5 supervisor-search">
          <label className="text-gray-500 text-xs">Supervisor</label>
          <input type="hidden" {...register("supervisorId")} />
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md ring-[1.5px] ring-gray-300 w-full">
              <input
                type="text"
                placeholder="Search teachers..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (selectedSupervisorId) {
                    setSelectedSupervisorId("");
                    setValue("supervisorId", "");
                  }
                }}
                className="bg-transparent outline-none w-full text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const results = teacherOptions.filter(
                    (teacher: { id: string; name: string }) =>
                      teacher.name
                        .toLowerCase()
                        .includes(searchInput.toLowerCase()),
                  );
                  setFilteredTeachers(results);
                  setShowSupervisorDropdown(true);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
            {showSupervisorDropdown && (
              <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map(
                    (teacher: { id: string; name: string }) => (
                      <div
                        key={teacher.id}
                        onClick={() => {
                          setSelectedSupervisorId(String(teacher.id));
                          setSearchInput(teacher.name);
                          setShowSupervisorDropdown(false);
                          setFilteredTeachers([]);
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
          {errors.supervisorId?.message && (
            <p className="text-red-400 text-xs">
              {errors.supervisorId.message.toString()}
            </p>
          )}
        </div>
      </div>
      <button className="bg-blue-400 p-2 rounded-md text-white">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default ClassForm;
