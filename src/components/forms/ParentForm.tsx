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
import {
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("forms.parent");
  const commonT = useTranslations("forms.common");
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
      setStudentsError(t("selectStudentRequired"));
      toast.error(t("selectStudentBeforeCreate"));
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
          toast(type === "create" ? t("created") : t("updated"));
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message || commonT("somethingWentWrong"));
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
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create" ? t("createTitle") : t("updateTitle")}
      </h1>
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="inline-flex items-center gap-2 font-semibold text-gray-700 text-sm">
          <ShieldCheck size={16} />
          {commonT("authenticationInfo")}
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          label={commonT("username")}
          name="username"
          defaultValue={data?.username}
          register={register}
          error={errors?.username}
        />
        <InputField
          label={commonT("email")}
          name="email"
          defaultValue={data?.email}
          register={register}
          error={errors?.email}
        />
        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">
            {commonT("password")}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="focus:bg-academixPurpleLight px-4 py-3 pe-10 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={
                showPassword
                  ? commonT("hidePassword")
                  : commonT("showPassword")
              }
              className="top-1/2 end-3 absolute text-gray-500 hover:text-gray-700 -translate-y-1/2"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors?.password?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.password.message.toString()}
            </p>
          )}
        </div>
      </div>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="inline-flex items-center gap-2 font-semibold text-gray-700 text-sm">
          <UserRound size={16} />
          {commonT("personalInfo")}
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          label={commonT("fullName")}
          name="name"
          defaultValue={data?.name}
          register={register}
          error={errors.name}
        />
        <InputField
          label={commonT("phone")}
          name="phone"
          defaultValue={data?.phone}
          register={register}
          error={errors.phone}
        />
        <InputField
          label={commonT("address")}
          name="address"
          defaultValue={data?.address}
          register={register}
          error={errors.address}
        />
        {type === "update" && (
          <input type="hidden" {...register("id")} defaultValue={data?.id} />
        )}
      </div>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <div className="flex flex-col gap-2 w-full student-search">
        <label className="inline-flex items-center gap-2 font-medium text-gray-700 text-sm">
          <Users size={16} />
          {t("students")}
        </label>
        <div className="relative">
          <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg focus-within:ring-0 transition-all">
            <input
              type="text"
              placeholder={commonT("searchStudents")}
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
            <div className="top-full inset-x-0 z-10 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
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
                      className="hover:bg-academixPurpleLight px-4 py-3 w-full hover:text-academixPurpleDark text-sm text-start transition-colors cursor-pointer"
                    >
                      {student.name}
                    </div>
                  ),
                )
              ) : (
                <div className="px-3 py-2 text-gray-500 text-sm">
                  {commonT("noStudentsFound")}
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
                  className="flex items-center gap-2 bg-academixPurpleLight px-4 py-2 rounded-full font-medium text-academixPurpleDark text-sm"
                >
                  <span>{student?.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedStudentIds(
                        selectedStudentIds.filter((id) => id !== studentId),
                      )
                    }
                    className="text-academixPurpleDark hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {errors.students?.message && (
          <p className="font-medium text-red-500 text-xs">
            {errors.students.message.toString()}
          </p>
        )}
        {studentsError && (
          <p className="font-medium text-red-500 text-xs">{studentsError}</p>
        )}
      </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
      >
        {isSubmitting
          ? commonT("submitting")
          : type === "create"
            ? t("create")
            : t("update")}
      </button>
    </form>
  );
};

export default ParentForm;


