"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import {
  Dispatch,
  SetStateAction,
  useTransition,
  useEffect,
  useState,
} from "react";
import { parentSchema, ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Eye, EyeOff, X, Search } from "lucide-react";

type ParentFormState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const ParentForm = ({
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
    formState: { errors },
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema),
  });

  const [showPassword, setShowPassword] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    data?.students?.map((student: string | { id: string }) =>
      typeof student === "string" ? student : student.id,
    ) ?? [],
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<
    { id: string; name: string }[]
  >([]);
  const [studentsError, setStudentsError] = useState("");
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    if (type === "create" && selectedStudentIds.length === 0) {
      setStudentsError("Select at least one student.");
      toast.error("Select at least one student before creating a parent.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const action = type === "create" ? createParent : updateParent;
        const result = await action({ success: false, error: false }, {
          ...data,
          students: selectedStudentIds,
        } as any);

        if (result.success) {
          toast(
            `Parent has been ${type === "create" ? "created" : "updated"}!`,
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message || "Something went wrong!");
      })();
    });
  });
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".student-search")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const { students } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new Parent" : "Update the Parent"}
      </h1>
      <span className="font-medium text-gray-400 text-xs">
        Authentication Information
      </span>
      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Username"
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label="Email"
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="p-2 pr-10 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="top-1/2 right-3 absolute text-gray-500 hover:text-gray-700 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors?.password?.message && (
            <p className="text-red-400 text-xs">
              {errors.password.message.toString()}
            </p>
          )}
        </div>
      </div>
      <span className="font-medium text-gray-400 text-xs">
        Personal Information
      </span>
      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="Full Name"
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        {type === "update" && (
          <input type="hidden" {...register("id")} defaultValue={data?.id} />
        )}
      </div>
      <div className="flex flex-col gap-2 w-full student-search">
        <label className="text-gray-500 text-xs">Students</label>
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md ring-[1.5px] ring-gray-300 w-full">
            <input
              type="text"
              placeholder="Search students..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const results = students?.filter(
                  (student: { id: string; name: string }) =>
                    student.name
                      .toLowerCase()
                      .includes(searchInput.toLowerCase()) &&
                    !selectedStudentIds.includes(String(student.id)),
                );
                setFilteredStudents(results || []);
                setShowDropdown(true);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          {showDropdown && (
            <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md max-h-40 overflow-y-auto">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(
                  (student: { id: string; name: string }) => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setStudentsError("");
                        setSelectedStudentIds([
                          ...selectedStudentIds,
                          String(student.id),
                        ]);
                        setSearchInput("");
                        setShowDropdown(false);
                        setFilteredStudents([]);
                      }}
                      className="hover:bg-blue-100 px-3 py-2 text-sm cursor-pointer"
                    >
                      {student.name}
                    </div>
                  ),
                )
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  No students found
                </div>
              )}
            </div>
          )}
        </div>
        {selectedStudentIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedStudentIds.map((studentId) => {
              const student = students?.find(
                (s: { id: string; name: string }) => String(s.id) === studentId,
              );
              return (
                <div
                  key={studentId}
                  className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm"
                >
                  <span>{student?.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentIds(
                        selectedStudentIds.filter((id) => id !== studentId),
                      )
                    }
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {errors.students?.message && (
          <p className="text-red-400 text-xs">
            {errors.students.message.toString()}
          </p>
        )}
        {studentsError && (
          <p className="text-red-400 text-xs">{studentsError}</p>
        )}
      </div>
      <button
        type="submit"
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

export default ParentForm;
