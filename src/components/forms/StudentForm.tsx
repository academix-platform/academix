"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { studentSchema, StudentSchema } from "@/lib/formValidationSchemas";
import { createStudent, updateStudent } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";
import { Eye, EyeOff } from "lucide-react";

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

  const [img, setImg] = useState<any>();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState<StudentFormState, StudentSchema>(
    type === "create" ? createStudent : updateStudent,
    {
      success: false,
      error: false,
      message: undefined,
    },
  );

  const onSubmit = handleSubmit((data) => {
    startTransition(() => {
      formAction(data);
    });
  });
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Student has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { grades, classes } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new student" : "Update the student"}
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
        <InputField
          label="Parent Id"
          name="parentId"
          defaultValue={data?.parentId}
          register={register}
          error={errors.parentId}
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
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Grade</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
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
            <p className="text-red-400 text-xs">
              {errors.gradeId.message.toString()}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Class</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
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
            <p className="text-red-400 text-xs">
              {errors.classId.message.toString()}
            </p>
          )}
        </div>
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
      {state.error && (
        <span className="text-red-500">
          {state.message || "Something went wrong!"}
        </span>
      )}
      <button type="submit" className="bg-blue-400 p-2 rounded-md text-white">
        {type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default StudentForm;
