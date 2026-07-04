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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("forms.result");
  const commonT = useTranslations("forms.common");
  const actionsT = useTranslations("actions");
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
          toast(type === "create" ? t("created") : t("updated"));
          setOpen(false);
          router.refresh();
          return;
        }

        toast.error(result.message ?? commonT("somethingWentWrong"));
      } catch {
        toast.error(commonT("somethingWentWrong"));
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
    <form className="flex flex-col gap-6" onSubmit={onSubmit}>
      <h1 className="font-bold text-gray-900 text-2xl">
        {type === "create" ? t("createTitle") : t("updateTitle")}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">
            {t("student")}
          </label>
          <input type="hidden" {...register("studentId")} />
          <div className="relative student-search">
            <div className="flex items-center gap-2 bg-white focus-within:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus-within:border-academixPurpleDark rounded-lg focus-within:ring-0 transition-all">
              <input
                type="text"
                placeholder={commonT("searchStudents")}
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
              <div className="top-full inset-x-0 z-10 absolute bg-white shadow-xl mt-2 border border-gray-200 rounded-lg max-h-56 overflow-y-auto">
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
          {errors.studentId?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.studentId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">
            {t("assessmentType")}
          </label>
          <select
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
            {...register("assessmentType")}
            defaultValue={initialAssessmentType}
          >
            <option value="exam">{t("exam")}</option>
            <option value="assignment">{t("assignment")}</option>
          </select>
          {errors.assessmentType?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.assessmentType.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">
            {t("assessment")}
          </label>
          <select
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
            {...register("assessmentId")}
            defaultValue={data?.examId ?? data?.assignmentId}
          >
            <option value="">{t("selectAssessment")}</option>
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
            <p className="font-medium text-red-500 text-xs">
              {errors.assessmentId.message.toString()}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2 w-full">
          <label className="font-medium text-gray-700 text-sm">
            {t("score")}
          </label>
          <input
            type="number"
            min={0}
            max={100}
            className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
            {...register("score")}
            defaultValue={data?.score}
          />
          {errors.score?.message && (
            <p className="font-medium text-red-500 text-xs">
              {errors.score.message.toString()}
            </p>
          )}
        </div>
      </div>

      {type === "update" && (
        <input type="hidden" {...register("id")} defaultValue={data?.id} />
      )}

      <button
        className="bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 px-6 py-3 rounded-lg w-full font-semibold text-white text-base transition-all"
        disabled={isSubmitting}
      >
        {isSubmitting
          ? commonT("submitting")
          : type === "create"
            ? actionsT("create")
            : actionsT("update")}
      </button>
    </form>
  );
};

export default ResultForm;


