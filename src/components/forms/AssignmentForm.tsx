"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import InputField from "../InputField";
import {
  assignmentSchema,
  AssignmentSchema,
} from "@/lib/formValidationSchemas";
import { createAssignment, updateAssignment } from "@/lib/actions";
import { Dispatch, SetStateAction, useMemo, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { Download, Upload, X, Clock, Search } from "lucide-react";

// دالة مساعدة لتحويل التاريخ إلى صيغة datetime-local
const toDatetimeLocalValue = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ─── مكون رفع الملفات الداخلي ──────────────────────────────────────────
function FileUploadSection({
  assignmentId,
  currentFileUrl,
  currentFileName,
  onFileSelect,
  onRemoveExisting,
}: {
  assignmentId?: number;
  currentFileUrl?: string | null;
  currentFileName?: string | null;
  onFileSelect: (file: File | null) => void;
  onRemoveExisting: () => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    onFileSelect(file);
    if (file && currentFileUrl) {
      setRemoveCurrent(true);
      onRemoveExisting();
    }
  };

  const handleRemoveSelected = () => {
    setSelectedFile(null);
    onFileSelect(null);
  };

  const handleRemoveCurrent = () => {
    setRemoveCurrent(true);
    onRemoveExisting();
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Assignment File (optional)
      </label>

      {/* الملف الحالي (في حالة التعديل) */}
      {currentFileUrl && !removeCurrent && !selectedFile && (
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded">
          <span className="text-sm truncate">
            {currentFileName || "Current file"}
          </span>
          <div className="flex gap-2">
            {assignmentId && (
              <a
                href={`/api/download/${assignmentId}?type=assignment`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
                title="Download current file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              type="button"
              onClick={handleRemoveCurrent}
              className="text-red-500 hover:text-red-700"
              title="Remove current file"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* اختيار ملف جديد */}
      <div className="flex items-center gap-2">
        <label className="cursor-pointer bg-purple-50 text-purple-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
          <Upload className="w-4 h-4" />
          {selectedFile
            ? "Change File"
            : currentFileUrl && !removeCurrent
            ? "Replace File"
            : "Upload File"}
          <input type="file" onChange={handleFileChange} className="hidden" />
        </label>
        {selectedFile && (
          <span className="text-sm text-gray-600 truncate">{selectedFile.name}</span>
        )}
      </div>

      {selectedFile && (
        <button
          type="button"
          onClick={handleRemoveSelected}
          className="text-xs text-red-500 hover:underline"
        >
          Remove selected
        </button>
      )}

      {!currentFileUrl && !selectedFile && (
        <p className="text-xs text-gray-400">No file attached yet. Upload one if needed.</p>
      )}
      {(removeCurrent || (currentFileUrl && selectedFile)) && (
        <p className="text-xs text-amber-600">The current file will be replaced.</p>
      )}
    </div>
  );
}

// ─── النموذج الرئيسي ─────────────────────────────────────────────────────
const AssignmentForm = ({
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
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssignmentSchema>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      subjectId: data?.subjectId,
      classIds: data?.classId ? [data.classId] : [],
      maxScore: data?.maxScore ?? 10,
      rubric: data?.rubric ?? "",
      allowLateSubmission: data?.allowLateSubmission ?? false,
    },
  });
  const isSubjectLocked = type === "create" && Boolean(data?.lockSubject) && Boolean(data?.subjectId);

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shouldRemoveFile, setShouldRemoveFile] = useState(false);

  // مراقبة قيمة allowLateSubmission لتحديث الـ UI
  const allowLateSubmission = watch("allowLateSubmission");

  const onSubmit = handleSubmit(async (formValues) => {
    const action = type === "create" ? createAssignment : updateAssignment;

    const formData = new FormData();
    Object.entries(formValues).forEach(([key, value]) => {
      if (key === "classIds" && Array.isArray(value)) {
        value.forEach((clsId) => formData.append("classIds", String(clsId)));
      } else if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    if (type === "update" && data?.id) {
      formData.append("id", String(data.id));
    }
    if (selectedFile) {
      formData.append("file", selectedFile);
    }
    if (shouldRemoveFile && data?.fileUrl) {
      formData.append("removeFile", "true");
    }

    startTransition(async () => {
      try {
        const result = await action({ success: false, error: false }, formData);
        if (result.success) {
          toast(`Assignment has been ${type === "create" ? "created" : "updated"}!`);
          setOpen(false);
          router.refresh();
        } else {
          toast.error(result.message ?? "Something went wrong!");
        }
      } catch (error) {
        console.error(error);
        toast.error("Something went wrong!");
      }
    });
  });

  const { subjects = [], classes = [], lessons = [] } = relatedData ?? {};
  const selectedSubjectId = useWatch({ control, name: "subjectId" });
  const selectedSubject = subjects.find(
    (subject: { id: number; name: string }) =>
      Number(subject.id) === Number(selectedSubjectId),
  );
  const [subjectSearch, setSubjectSearch] = useState(
    data?.subjectName ?? selectedSubject?.name ?? "",
  );
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const watchedClassIds = useWatch({ control, name: "classIds" });
  const classIdsRegister = register("classIds");
  const selectedClassIds = useMemo(
    () => (watchedClassIds ?? []) as Array<string | number>,
    [watchedClassIds],
  );
  const selectedSubjectIdNumber = Number(selectedSubjectId);

  const filteredSubjects = useMemo(() => {
    const search = subjectSearch.trim().toLowerCase();
    if (!search) return subjects;

    return subjects.filter((subject: { id: number; name: string }) =>
      subject.name.toLowerCase().includes(search),
    );
  }, [subjects, subjectSearch]);

  const availableClassIds = useMemo(() => {
    if (!selectedSubjectId || Number.isNaN(selectedSubjectIdNumber)) {
      return new Set<number>();
    }
    return new Set<number>(
      lessons
        .filter((lesson: { subjectId: number; classId: number }) => lesson.subjectId === selectedSubjectIdNumber)
        .map((lesson: { subjectId: number; classId: number }) => lesson.classId),
    );
  }, [lessons, selectedSubjectId, selectedSubjectIdNumber]);

  const filteredClasses =
    selectedSubjectId && !Number.isNaN(selectedSubjectIdNumber)
      ? classes.filter((cls: { id: number; name: string }) => availableClassIds.has(cls.id))
      : [];

  const selectedClassIdsAsNumbers = useMemo(
    () =>
      (selectedClassIds as Array<string | number>)
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id)),
    [selectedClassIds],
  );

  const filteredClassIds = useMemo<number[]>(
    () => filteredClasses.map((cls: { id: number; name: string }) => cls.id),
    [filteredClasses],
  );

  const areAllFilteredSelected =
    filteredClassIds.length > 0 &&
    filteredClassIds.every((id) => selectedClassIdsAsNumbers.includes(id));

  const toggleAllFilteredClasses = (checked: boolean) => {
    const selectedSet = new Set<number>(selectedClassIdsAsNumbers);
    if (checked) {
      for (const classId of filteredClassIds) selectedSet.add(classId);
    } else {
      for (const classId of filteredClassIds) selectedSet.delete(classId);
    }
    setValue("classIds", Array.from(selectedSet), { shouldDirty: true, shouldValidate: true });
  };

  const toggleSingleClass = (classId: number, checked: boolean) => {
    const selectedSet = new Set<number>(selectedClassIdsAsNumbers);
    if (checked) selectedSet.add(classId);
    else selectedSet.delete(classId);
    setValue("classIds", Array.from(selectedSet), { shouldDirty: true, shouldValidate: true });
  };

  const nowDefault = toDatetimeLocalValue(new Date());
  const startDefaultValue = type === "create" ? nowDefault : toDatetimeLocalValue(data?.startDate);
  const endDefaultValue = type === "create" ? nowDefault : toDatetimeLocalValue(data?.endDate);

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create" ? "Create a new assignment" : "Update the assignment"}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <InputField
          label="Assignment Title"
          name="title"
          defaultValue={data?.title}
          register={register}
          error={errors?.title}
          inputProps={{ placeholder: "e.g. Chapter 4 Homework" }}
        />
        <InputField
          label="Start Date"
          name="startDate"
          type="datetime-local"
          defaultValue={startDefaultValue}
          register={register}
          error={errors?.startDate}
        />
        <InputField
          label="End Date"
          name="endDate"
          type="datetime-local"
          defaultValue={endDefaultValue}
          register={register}
          error={errors?.endDate}
        />
        <InputField
          label="Marks"
          name="maxScore"
          type="number"
          defaultValue={data?.maxScore ?? 10}
          register={register}
          error={errors?.maxScore}
          inputProps={{ min: 1, step: 0.5 }}
        />
        {type === "update" && (
          <input type="hidden" {...register("id")} defaultValue={data?.id} />
        )}

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Subject</label>
          {isSubjectLocked ? (
            <>
              <input type="hidden" {...register("subjectId")} value={data.subjectId} />
              <div className="bg-gray-50 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 text-sm">
                {data?.subjectName ?? `Subject #${data.subjectId}`}
              </div>
            </>
          ) : (
            <div className="relative">
              <input type="hidden" {...register("subjectId")} />
              <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg transition-all">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={subjectSearch}
                  placeholder="Search subject..."
                  onFocus={() => setShowSubjectDropdown(true)}
                  onBlur={() => {
                    window.setTimeout(() => setShowSubjectDropdown(false), 120);
                  }}
                  onChange={(e) => {
                    setSubjectSearch(e.target.value);
                    setShowSubjectDropdown(true);
                    if (selectedSubjectId) {
                      setValue("subjectId", undefined as any, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("classIds", [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                  className="bg-transparent outline-none w-full text-sm"
                />
                {subjectSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setSubjectSearch("");
                      setValue("subjectId", undefined as any, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("classIds", [], {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setShowSubjectDropdown(true);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="Clear subject"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showSubjectDropdown && (
                <div className="top-full right-0 left-0 z-20 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map(
                      (subject: { id: number; name: string }) => {
                        const isSelected =
                          Number(subject.id) === Number(selectedSubjectId);

                        return (
                          <button
                            type="button"
                            key={subject.id}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setValue("subjectId", subject.id, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setValue("classIds", [], {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setSubjectSearch(subject.name);
                              setShowSubjectDropdown(false);
                            }}
                            className={`px-4 py-3 w-full text-sm text-left transition-colors ${
                              isSelected
                                ? "bg-academixPurpleLight text-academixPurpleDark font-medium"
                                : "hover:bg-academixPurpleLight hover:text-academixPurpleDark"
                            }`}
                          >
                            {subject.name}
                          </button>
                        );
                      },
                    )
                  ) : (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      No subjects found.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {errors.subjectId?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.subjectId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">Classes</label>
          <div className="flex flex-col gap-2 p-3 rounded-md ring-[1.5px] ring-gray-300 max-h-[220px] overflow-y-auto">
            <label className="flex items-center gap-2 mb-4 text-gray-700 text-sm">
              <input
                type="checkbox"
                checked={areAllFilteredSelected}
                onChange={(e) => toggleAllFilteredClasses(e.target.checked)}
                disabled={filteredClassIds.length === 0}
                className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
              />
              <span className="font-medium">Select all</span>
            </label>
            {filteredClasses.map((cls: { id: number; name: string }) => (
              <label key={cls.id} className="flex items-center gap-2 text-gray-700 text-sm">
                <input
                  {...classIdsRegister}
                  type="checkbox"
                  value={cls.id}
                  checked={selectedClassIdsAsNumbers.includes(cls.id)}
                  onChange={(e) => toggleSingleClass(cls.id, e.target.checked)}
                  className="border-gray-300 rounded focus:ring-blue-500 w-4 h-4 text-blue-500"
                />
                <span>{cls.name}</span>
              </label>
            ))}
            {filteredClasses.length === 0 && (
              <p className="text-gray-400 text-xs">
                {selectedSubjectId
                  ? "No classes found for this subject."
                  : "Select a subject first to see available classes."}
              </p>
            )}
          </div>
          {selectedClassIds.length > 0 && (
            <p className="text-gray-400 text-xs">
              {selectedClassIds.length} class{selectedClassIds.length === 1 ? " is" : "es are"} selected
            </p>
          )}
          {errors.classIds?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.classIds.message.toString()}
            </p>
          )}
        </div>
      </div>

      {/* ── قسم رفع الملفات ── */}
      <div className="flex flex-col gap-2">
        <label className="font-medium text-gray-700 text-sm">
          Model Answer / Rubric
        </label>
        <textarea
          {...register("rubric")}
          defaultValue={data?.rubric ?? ""}
          placeholder="Write the expected answer or explain how marks should be awarded..."
          className="w-full min-h-[110px] rounded-lg border-2 border-gray-200 p-3 text-sm outline-none transition-all focus:border-academixPurpleDark focus:bg-academixPurpleLight"
        />
        <p className="text-xs text-gray-400">
          Used to guide assignment grading and AI evaluation.
        </p>
        {errors.rubric?.message && (
          <p className="font-medium text-red-500 text-xs">
            {errors.rubric.message.toString()}
          </p>
        )}
      </div>

      <div className="col-span-full">
        <FileUploadSection
          assignmentId={data?.id}
          currentFileUrl={data?.fileUrl}
          currentFileName={data?.fileName}
          onFileSelect={setSelectedFile}
          onRemoveExisting={() => setShouldRemoveFile(true)}
        />
      </div>

      {/* ── خيار السماح بالتسليم المتأخر ── */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${allowLateSubmission ? "bg-amber-100" : "bg-gray-100"}`}>
            <Clock className={`w-4 h-4 ${allowLateSubmission ? "text-amber-600" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Allow Late Submission</p>
            <p className="text-xs text-gray-400">
              {allowLateSubmission
                ? "Students can submit after the deadline"
                : "Students cannot submit after the deadline"}
            </p>
          </div>
        </div>
        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            {...register("allowLateSubmission")}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer
                          peer-checked:after:translate-x-full peer-checked:after:border-white
                          after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                          after:bg-white after:border-gray-300 after:border after:rounded-full
                          after:h-5 after:w-5 after:transition-all
                          peer-checked:bg-amber-500" />
        </label>
      </div>

      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Submitting..." : type === "create" ? "Create" : "Update"}
      </button>
    </form>
  );
};

export default AssignmentForm;
