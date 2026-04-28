"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { startTransition, useEffect, useState } from "react";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { Eye, EyeOff, Search, X } from "lucide-react";

type TeacherFormState = {
  success: boolean;
  error: boolean;
  message?: string;
};

type SubjectOption = {
  id: string | number;
  name: string;
};

type SubjectClassPair = {
  subjectId: string;
};

const PASSWORD_MASK = "********";

const TeacherForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const subjects: SubjectOption[] = relatedData?.subjects ?? [];

  const buildInitialPairs: SubjectClassPair[] =
    data?.subjects?.map((subject: { id: string | number }) => ({
      subjectId: String(subject.id),
    })) ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      password: type === "update" ? PASSWORD_MASK : "",
      img: data?.img ?? "",
      subjectClassPairs: buildInitialPairs,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "subjectClassPairs",
  });

  const [img, setImg] = useState<string>(data?.img ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [filteredSubjectOptions, setFilteredSubjectOptions] = useState<
    SubjectOption[]
  >([]);
  const subjectClassPairsWatch = useWatch({
    control,
    name: "subjectClassPairs",
  }) as SubjectClassPair[] | undefined;

  const onSubmit = handleSubmit((formValues) => {
    const payload = {
      ...formValues,
      password:
        formValues.password === PASSWORD_MASK ? "" : formValues.password,
    };

    startTransition(() => {
      void (async () => {
        const action = type === "create" ? createTeacher : updateTeacher;
        const result = await action(
          { success: false, error: false },
          payload as any,
        );

        if (result.success) {
          toast(
            `${type === "create" ? "Teacher created" : "Teacher updated"} successfully!`,
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
  // effect not needed; action handled directly in onSubmit

  const getSubjectById = (subjectId: string) =>
    subjects.find((subject) => String(subject.id) === subjectId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".subject-search")) {
        setShowSubjectDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSubjectSelect = (subjectId: string) => {
    if (
      (subjectClassPairsWatch ?? []).some(
        (pair) => String(pair.subjectId) === subjectId,
      )
    ) {
      return;
    }

    append({ subjectId });
    setSubjectSearch("");
    setShowSubjectDropdown(false);
    setFilteredSubjectOptions([]);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">{`${type === "create" ? "Create" : "Update"} Teacher`}</h1>
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
          label="Name"
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
        {type === "update" && (
          <input type="hidden" {...register("id")} defaultValue={data?.id} />
        )}
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Sex</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            {...register("sex")}
            defaultValue={data?.sex}
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          {errors.sex?.message && (
            <p className="text-red-400 text-xs">
              {errors.sex.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full md:w-3/5 subject-search">
          <div className="flex justify-between items-end gap-4">
            <div>
              <label className="text-gray-500 text-xs">Subjects</label>
              <p className="text-[11px] text-gray-400">
                Choose one or more subjects this teacher will teach.
              </p>
            </div>
            <span className="bg-slate-100 px-3 py-1 rounded-full font-medium text-[11px] text-gray-600 text-center">
              {(subjectClassPairsWatch ?? []).length} selected
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 bg-white px-4 py-2 border border-gray-200 focus-within:border-blue-400 rounded-xl focus-within:ring-2 focus-within:ring-blue-100">
              <input
                type="search"
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder="Search subjects..."
                aria-label="Search subjects"
                className="bg-transparent outline-none w-full text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const keyword = subjectSearch.trim().toLowerCase();
                  const results = subjects.filter(
                    (subject: SubjectOption) =>
                      subject.name.toLowerCase().includes(keyword) &&
                      !(subjectClassPairsWatch ?? []).some(
                        (pair: SubjectClassPair) =>
                          String(pair.subjectId) === String(subject.id),
                      ),
                  );
                  setFilteredSubjectOptions(results);
                  setShowSubjectDropdown(true);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Search subjects"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {showSubjectDropdown && (
              <div className="top-full right-0 left-0 z-10 absolute bg-white shadow-lg mt-1 border border-gray-300 rounded-md max-h-56 overflow-y-auto">
                {filteredSubjectOptions.length > 0 ? (
                  filteredSubjectOptions.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      className="hover:bg-blue-100 px-3 py-2 w-full text-sm text-left"
                      onClick={() => handleSubjectSelect(String(subject.id))}
                    >
                      {subject.name}
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-gray-500 text-sm">
                    No subjects found
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {(subjectClassPairsWatch ?? []).length > 0 ? (
              (subjectClassPairsWatch ?? []).map(
                (pair: SubjectClassPair, index: number) => {
                  const subject = getSubjectById(pair.subjectId);

                  return (
                    <div
                      key={fields[index]?.id ?? pair.subjectId}
                      className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-blue-800 text-sm"
                    >
                      <span>{subject?.name ?? pair.subjectId}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-blue-600 hover:text-blue-900"
                        aria-label={`Remove ${subject?.name ?? "subject"}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                },
              )
            ) : (
              <div className="bg-gray-50 px-4 py-3 border border-gray-300 border-dashed rounded-xl text-gray-500 text-sm">
                No subjects selected yet.
              </div>
            )}
          </div>

          {errors.subjectClassPairs?.message && (
            <p className="text-red-400 text-xs">
              {errors.subjectClassPairs.message.toString()}
            </p>
          )}
        </div>

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
              <div className="flex flex-col gap-2 text-gray-500 text-xs">
                <div
                  onClick={() => open()}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Image src="/upload.png" alt="" width={28} height={28} />
                  <span>Upload a photo</span>
                </div>
                {img && (
                  <div className="flex items-end gap-3">
                    <Image
                      src={img}
                      alt="Teacher preview"
                      width={64}
                      height={64}
                      className="border border-gray-200 rounded-md w-16 h-16 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImg("");
                        setValue("img", "", { shouldDirty: true });
                      }}
                      className="text-red-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          }}
        </CldUploadWidget>
      </div>
      <button className="bg-blue-400 p-2 rounded-md text-white">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default TeacherForm;
