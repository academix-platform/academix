"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import { startTransition, useActionState, useEffect, useState } from "react";
import { createTeacher, updateTeacher } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { Eye, EyeOff } from "lucide-react";

type TeacherFormState = {
  success: boolean;
  error: boolean;
  message?: string;
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
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      password: type === "update" ? PASSWORD_MASK : "",
      img: data?.img ?? "",
      subjects:
        data?.subjects?.map((subject: string | { id: number | string }) =>
          typeof subject === "string" ? subject : String(subject.id),
        ) ?? [],
    },
  });

  const [img, setImg] = useState<string>(data?.img ?? "");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState<TeacherFormState, TeacherSchema>(
    type === "create" ? createTeacher : updateTeacher,
    {
      success: false,
      error: false,
      message: undefined,
    },
  );

  const onSubmit = handleSubmit((data) => {
    const payload = {
      ...data,
      password: data.password === PASSWORD_MASK ? "" : data.password,
    };

    startTransition(() => {
      formAction(payload);
    });
  });

  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      toast(
        `${type === "create" ? "Teacher created" : "Teacher updated"} successfully!`,
      );
      setOpen(false);
      router.refresh();
    }
  }, [state, type, setOpen, router]);

  const { subjects } = relatedData;

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
          defaultValue={data?.birthday.toISOString().split("T")[0]}
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
        <div className="flex flex-col gap-2 w-full">
          <label className="text-gray-500 text-xs">Subjects</label>
          <div className="gap-2 grid grid-cols-1 sm:grid-cols-2 p-3 rounded-md ring-[1.5px] ring-gray-300 w-full max-h-40 overflow-y-auto text-sm">
            {subjects?.map((subject: { id: string | number; name: string }) => {
              const subjectId = String(subject.id);

              return (
                <label
                  key={subject.id}
                  className="flex items-center gap-2 text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={subjectId}
                    className="border-gray-300 rounded focus:ring-blue-400 w-4 h-4 text-blue-500"
                    {...register("subjects")}
                  />
                  <span>{subject.name}</span>
                </label>
              );
            })}
          </div>
          {errors.subjects?.message && (
            <p className="text-red-400 text-xs">
              {errors.subjects.message.toString()}
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
      {state.error && (
        <span className="text-red-500">
          {state.message || "Something went wrong!"}
        </span>
      )}
      <button className="bg-blue-400 p-2 rounded-md text-white">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default TeacherForm;
