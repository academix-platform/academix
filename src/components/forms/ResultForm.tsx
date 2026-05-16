"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { createResult, updateResult } from "@/lib/actions";
import { resultSchema, ResultSchema } from "@/lib/formValidationSchemas";
import { Search } from "lucide-react";

const ResultForm = ({
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
  const initialAssessmentType =
    data?.examId != null
      ? "exam"
      : data?.assignmentId != null
        ? "assignment"
        : "exam";

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ResultSchema>({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      id: data?.id,
      studentId: data?.studentId,
      score: data?.score,
      assessmentType: initialAssessmentType,
      assessmentId: data?.examId ?? data?.assignmentId,
    },
  });

  const router = useRouter();
  const [isSubmitting, startTransition] = useTransition();
  const [searchInput, setSearchInput] = useState(data?.studentName ?? "");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    data?.studentId ?? "",
  );
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredStudents, setFilteredStudents] = useState<
    { id: string; name: string }[]
  >([]);

  const onSubmit = handleSubmit((formValues) => {
    const action = type === "create" ? createResult : updateResult;

    startTransition(async () => {
      try {
        const result = await action(
          { success: false, error: false },
          formValues,
        );

        if (result.success) {
          toast(
            `Result has been ${type === "create" ? "created" : "updated"}!`,
          );
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? "Something went wrong!");
      } catch {
        toast.error("Something went wrong!");
      }
    });
  });

  const { students = [], exams = [], assignments = [] } = relatedData ?? {};
  const selectedAssessmentType = useWatch({ control, name: "assessmentType" });

  const currentAssessments = useMemo(() => {
    return selectedAssessmentType === "assignment" ? assignments : exams;
  }, [assignments, exams, selectedAssessmentType]);

  useEffect(() => {
    setValue("studentId", selectedStudentId, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [selectedStudentId, setValue]);

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

  useEffect(() => {
    const currentIds = new Set<number>(
      currentAssessments
        .map((assessment: { id: number }) => Number(assessment.id))
        .filter((id: number) => !Number.isNaN(id)),
    );

    const existingAssessmentId = Number(data?.examId ?? data?.assignmentId);

    if (type === "update" && currentIds.has(existingAssessmentId)) {
      setValue("assessmentId", existingAssessmentId, {
        shouldDirty: false,
        shouldValidate: true,
      });
      return;
    }

    const firstAssessmentId = currentAssessments[0]?.id;
    if (firstAssessmentId) {
      setValue("assessmentId", Number(firstAssessmentId), {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    setValue("assessmentId", 0, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    currentAssessments,
    data?.assignmentId,
    data?.examId,
    selectedAssessmentType,
    setValue,
    type,
  ]);

  return (
    <form className="flex flex-col gap-8" onSubmit={onSubmit}>
      <h1 className="font-semibold text-xl">
        {type === "create" ? "Create a new result" : "Update the result"}
      </h1>

      <div className="flex flex-wrap justify-between gap-4">
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Student</label>
          <input type="hidden" {...register("studentId")} />
          <div className="relative student-search">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md ring-[1.5px] ring-gray-300 w-full">
              <input
                type="text"
                placeholder="Search students..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (selectedStudentId) {
                    setSelectedStudentId("");
                  }
                }}
                className="bg-transparent outline-none w-full text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  const results = students.filter(
                    (student: { id: string; name: string }) =>
                      student.name
                        .toLowerCase()
                        .includes(searchInput.toLowerCase()),
                  );
                  setFilteredStudents(results);
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
                          setSelectedStudentId(student.id);
                          setSearchInput(student.name);
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
          {errors.studentId?.message && (
            <p className="text-red-400 text-xs">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Assessment Type</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            {...register("assessmentType")}
            defaultValue={initialAssessmentType}
          >
            <option value="exam">Exam</option>
            <option value="assignment">Assignment</option>
          </select>
          {errors.assessmentType?.message && (
            <p className="text-red-400 text-xs">
              {errors.assessmentType.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/3">
          <label className="text-gray-500 text-xs">Assessment</label>
          <select
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            {...register("assessmentId")}
            defaultValue={data?.examId ?? data?.assignmentId}
          >
            <option value="">Select assessment</option>
            {currentAssessments.map(
              (assessment: {
                id: number;
                title: string;
                subjectName: string;
                className: string;
              }) => (
                <option key={assessment.id} value={assessment.id}>
                  {assessment.title} ({assessment.subjectName} -{" "}
                  {assessment.className})
                </option>
              ),
            )}
          </select>
          {errors.assessmentId?.message && (
            <p className="text-red-400 text-xs">
              {errors.assessmentId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-gray-500 text-xs">Score</label>
          <input
            type="number"
            min={0}
            max={100}
            className="p-2 rounded-md ring-[1.5px] ring-gray-300 w-full text-sm"
            {...register("score")}
            defaultValue={data?.score}
          />
          {errors.score?.message && (
            <p className="text-red-400 text-xs">
              {errors.score.message.toString()}
            </p>
          )}
        </div>
      </div>

      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}

      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 p-2 rounded-md text-white transition-all"
        disabled={isSubmitting}
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

export default ResultForm;
