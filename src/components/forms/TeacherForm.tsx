"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { useEffect, useTransition, useState } from "react";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  BookOpen,
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import ProfileImageUpload from "./ProfileImageUpload";

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
  const t = useTranslations("forms.teacher");
  const commonT = useTranslations("forms.common");
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

  const [isSubmitting, startTransition] = useTransition();

  const onSubmit = handleSubmit((formValues) => {
    const payload = {
      ...formValues,
      img: img || formValues.img || "",
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
          toast(type === "create" ? t("created") : t("updated"));
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? commonT("somethingWentWrong"));
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
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <div>
        <h1 className="font-bold text-gray-900 text-2xl">
          {type === "create" ? t("createTitle") : t("updateTitle")}
        </h1>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <span className="inline-flex items-center gap-2 font-semibold text-gray-700 text-sm">
          <ShieldCheck size={16} />
          {commonT("authenticationInfo")}
        </span>
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
                className="top-1/2 end-3 absolute text-gray-400 hover:text-academixPurpleDark transition-colors -translate-y-1/2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <InputField
            label={commonT("name")}
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
          <InputField
            label={commonT("bloodType")}
            name="bloodType"
            defaultValue={data?.bloodType}
            register={register}
            error={errors.bloodType}
          />
          <InputField
            label={commonT("birthday")}
            name="birthday"
            defaultValue={data?.birthday?.toISOString?.().split("T")[0]}
            register={register}
            error={errors.birthday}
            type="date"
          />
          {type === "update" && (
            <input type="hidden" {...register("id")} defaultValue={data?.id} />
          )}
          <div className="flex flex-col gap-2 w-full">
            <label className="font-medium text-gray-700 text-sm">
              {commonT("sex")}
            </label>
            <select
              className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 text-sm transition-all"
              {...register("sex")}
              defaultValue={data?.sex}
            >
              <option value="">{commonT("selectSex")}</option>
              <option value="MALE">{commonT("male")}</option>
              <option value="FEMALE">{commonT("female")}</option>
            </select>
            {errors.sex?.message && (
              <p className="font-medium text-red-500 text-xs">
                {errors.sex.message.toString()}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-gray-50 p-6 rounded-xl">
        <div className="flex flex-col gap-3 w-full subject-search">
          <div className="flex justify-between items-end gap-4">
            <div>
              <label className="inline-flex items-center gap-2 font-medium text-gray-700 text-sm">
                <BookOpen size={16} />
                {t("subjects")}
              </label>
              <p className="mt-1 font-medium text-gray-700 text-sm">
                {t("subjectsHelp")}
              </p>
            </div>
            <span className="bg-academixPurpleLight px-4 py-2 rounded-full font-semibold text-academixPurpleDark text-xs">
              {commonT("selected", {
                count: (subjectClassPairsWatch ?? []).length,
              })}
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg focus-within:ring-0 transition-all">
              <input
                type="search"
                value={subjectSearch}
                onChange={(event) => setSubjectSearch(event.target.value)}
                placeholder={commonT("searchSubjects")}
                aria-label={commonT("searchSubjects")}
                className="bg-transparent outline-none w-full text-sm placeholder-gray-400"
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
                className="text-gray-400 hover:text-academixPurpleDark transition-colors"
                aria-label={commonT("searchSubjects")}
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {showSubjectDropdown && (
              <div className="top-full inset-x-0 z-10 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
                {filteredSubjectOptions.length > 0 ? (
                  filteredSubjectOptions.map((subject) => (
                    <button
                      key={subject.id}
                      type="button"
                      className="hover:bg-academixPurpleLight px-4 py-3 w-full hover:text-academixPurpleDark text-sm text-start transition-colors"
                      onClick={() => handleSubjectSelect(String(subject.id))}
                    >
                      {subject.name}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-gray-500 text-sm">
                    {commonT("noSubjectsFound")}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            {(subjectClassPairsWatch ?? []).length > 0 ? (
              (subjectClassPairsWatch ?? []).map(
                (pair: SubjectClassPair, index: number) => {
                  const subject = getSubjectById(pair.subjectId);

                  return (
                    <div
                      key={fields[index]?.id ?? pair.subjectId}
                      className="flex items-center gap-2 bg-academixPurpleLight px-4 py-2 rounded-full font-medium text-academixPurpleDark text-sm"
                    >
                      <span>{subject?.name ?? pair.subjectId}</span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-academixPurpleDark hover:text-red-500 transition-colors"
                        aria-label={t("removeSubject", {
                          subject: subject?.name ?? t("subjects"),
                        })}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  );
                },
              )
            ) : (
              <div className="bg-white px-4 py-3 border-2 border-gray-300 border-dashed rounded-lg w-full text-gray-500 text-sm">
                {t("noSubjectsSelected")}
              </div>
            )}
          </div>

          {errors.subjectClassPairs?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.subjectClassPairs.message.toString()}
            </p>
          )}
        </div>

        <div className="pt-6 border-gray-200 border-t">
          <input type="hidden" {...register("img")} defaultValue={img} />
          <ProfileImageUpload
            value={img}
            uploadLabel={t("uploadPhoto")}
            previewAlt={t("previewAlt")}
            photoUploadedLabel={commonT("photoUploaded")}
            removePhotoLabel={commonT("removePhoto")}
            errorMessage={commonT("somethingWentWrong")}
            onChange={(secureUrl) => {
              setImg(secureUrl);
              setValue("img", secureUrl, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          />
        </div>
      </div>

      <button
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

export default TeacherForm;
