"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import {
  Dispatch,
  SetStateAction,
  useTransition,
  useEffect,
  useState,
} from "react";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import {
  Camera,
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";

type StudentFormState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const StudentForm = ({
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
    setValue,
    formState: { errors },
  } = useForm<StudentSchema>({
    resolver: zodResolver(studentSchema),
  });

  const [img, setImg] = useState<string>(data?.img ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [searchInput, setSearchInput] = useState(data?.parent?.name ?? "");
  const [selectedParentId, setSelectedParentId] = useState<string>(
    data?.parentId ?? "",
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredParents, setFilteredParents] = useState<
    { id: string; name: string }[]
  >([]);
  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      void (async () => {
        const action = type === "create" ? createStudent : updateStudent;
        const result = await action(
          { success: false, error: false },
          data as any,
        );

        if (result.success) {
          toast(
            `Student has been ${type === "create" ? "created" : "updated"}!`,
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
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".parent-search")) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const { grades, classes, parents } = relatedData;

  useEffect(() => {
    setValue("parentId", selectedParentId);
  }, [selectedParentId, setValue]);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create" ? "Create a new student" : "Update the student"}
      </h1>
      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="inline-flex items-center gap-2 font-semibold text-gray-700 text-sm">
          <ShieldCheck size={16} />
          Authentication Information
        </span>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register("password")}
                className="focus:bg-academixPurpleLight px-4 py-3 pr-10 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400"
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
          Personal Information
        </span>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
          <InputField
            label="Blood Type"
            name="bloodType"
            defaultValue={data?.bloodType}
            register={register}
            error={errors.bloodType}
          />
          <InputField
            label="Birthday"
            name="birthday"
            defaultValue={data?.birthday?.toISOString?.().split("T")[0]}
            register={register}
            error={errors.birthday}
            type="date"
          />
          <div className="flex flex-col gap-2 w-full parent-search">
            <label className="font-medium text-gray-700 text-sm">
              Parent (optional)
            </label>
            <input type="hidden" {...register("parentId")} />
            <div className="relative">
              <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg focus-within:ring-0 transition-all">
                <input
                  type="text"
                  placeholder="Search parents..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    if (selectedParentId) {
                      setSelectedParentId("");
                      setValue("parentId", "");
                    }
                  }}
                  className="bg-transparent outline-none w-full text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    const results = parents?.filter(
                      (parent: { id: string; name: string }) =>
                        parent.name
                          .toLowerCase()
                          .includes(searchInput.toLowerCase()),
                    );
                    setFilteredParents(results || []);
                    setShowDropdown(true);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
              {showDropdown && (
                <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
                  {filteredParents.length > 0 ? (
                    filteredParents.map(
                      (parent: { id: string; name: string }) => (
                        <div
                          key={parent.id}
                          onClick={() => {
                            setSelectedParentId(String(parent.id));
                            setSearchInput(parent.name);
                            setShowDropdown(false);
                            setFilteredParents([]);
                          }}
                          className="hover:bg-academixPurpleLight px-4 py-3 w-full hover:text-academixPurpleDark text-sm text-left transition-colors cursor-pointer"
                        >
                          {parent.name}
                        </div>
                      ),
                    )
                  ) : (
                    <div className="px-3 py-2 text-gray-500 text-sm">
                      No parents found
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.parentId?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.parentId.message.toString()}
              </p>
            )}
          </div>
          {type === "update" && (
            <input type="hidden" {...register("id")} defaultValue={data?.id} />
          )}
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">Sex</label>
            <select
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
              {...register("sex")}
              defaultValue={data?.sex}
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
            {errors.sex?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.sex.message.toString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">Status</label>
            <select
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
              {...register("status")}
              defaultValue={data?.status || "ACTIVE"}
            >
              <option value="ACTIVE">Regular</option>
              <option value="REPEATED">Repeated</option>
              <option value="GRADUATED">Graduated</option>
              <option value="LEFT">Left</option>
            </select>
            {errors.status?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.status.message.toString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">Grade</label>
            <select
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
              {...register("gradeId")}
              defaultValue={data?.gradeId}
            >
              {grades.map((grade: { id: number; level: number }) => (
                <option value={grade.id} key={grade.id}>
                  {grade.level}
                </option>
              ))}
            </select>
            {errors.gradeId?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.gradeId.message.toString()}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">Class</label>
            <select
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
              {...register("classId")}
              defaultValue={data?.classId}
            >
              {classes.map(
                (classItem: {
                  id: number;
                  name: string;
                  capacity: number;
                  _count: { students: number };
                }) => (
                  <option value={classItem.id} key={classItem.id}>
                    ({classItem.name} -{" "}
                    {classItem._count.students + "/" + classItem.capacity}{" "}
                    Capacity)
                  </option>
                ),
              )}
            </select>
            {errors.classId?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.classId.message.toString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <div className="pt-0">
          <input type="hidden" {...register("img")} defaultValue={img} />
          <CldUploadWidget
            uploadPreset="school"
            onSuccess={(result, widget) => {
              const secureUrl =
                (result.info as { secure_url?: string })?.secure_url ?? "";
              setImg(secureUrl);
              setValue("img", secureUrl, { shouldDirty: true });
              widget.close();
            }}
          >
            {({ open }) => {
              return (
                <div className="flex flex-col gap-4">
                  <div
                    onClick={() => open()}
                    className="group flex items-center gap-3 hover:bg-academixPurpleLight p-4 border-2 border-gray-300 hover:border-academixPurpleDark border-dashed rounded-lg transition-all cursor-pointer"
                  >
                    <Image
                      src="/upload.png"
                      alt=""
                      width={32}
                      height={32}
                      className="group-hover:scale-110 transition-transform"
                    />
                    <div>
                      <span className="inline-flex items-center gap-2 font-medium text-gray-700 text-sm">
                        <Camera size={16} />
                        Upload Student Photo
                      </span>
                    </div>
                  </div>
                  {img && (
                    <div className="flex items-start gap-4 bg-white p-4 border border-gray-200 rounded-lg">
                      <Image
                        src={img}
                        alt="Student preview"
                        width={80}
                        height={80}
                        className="border border-gray-200 rounded-lg w-20 h-20 object-cover"
                      />
                      <div className="flex-1">
                        <p className="mb-2 font-medium text-gray-700 text-sm">
                          Photo uploaded successfully
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setImg("");
                            setValue("img", "", { shouldDirty: true });
                          }}
                          className="font-medium text-red-500 hover:text-red-700 text-sm transition-colors"
                        >
                          Remove photo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            }}
          </CldUploadWidget>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
      >
        {isSubmitting
          ? "Submitting..."
          : type === "create"
            ? "Create Student"
            : "Update Student"}
      </button>
    </form>
  );
};

export default StudentForm;
