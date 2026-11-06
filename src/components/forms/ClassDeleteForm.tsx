"use client";

import {
  deleteClass,
  type ClassDeletePayload,
} from "@/lib/actions/class.actions";
import {
  Dispatch,
  SetStateAction,
  useActionState,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";

type ClassDeleteFormProps = {
  data: {
    id: number;
    name: string;
    gradeId: number;
    capacity: number;
    _count?: {
      students?: number;
      lessons?: number;
    };
  };
  relatedData?: {
    classes?: Array<{
      id: number;
      name: string;
      capacity: number;
      gradeId: number;
      grade?: { level: number };
      _count?: {
        students?: number;
        lessons?: number;
      };
    }>;
    grades?: Array<{ id: number; level: number }>;
    teachers?: Array<{ id: string; name: string }>;
  };
  setOpen: Dispatch<SetStateAction<boolean>>;
};

type FormState = {
  success: boolean;
  error: boolean;
  message?: string;
};

const ClassDeleteForm = ({
  data,
  relatedData,
  setOpen,
}: ClassDeleteFormProps) => {
  const t = useTranslations("forms.classDelete");
  const commonT = useTranslations("forms.common");
  const actionsT = useTranslations("actions");
  const router = useRouter();
  const [state, formAction] = useActionState<FormState, ClassDeletePayload>(
    deleteClass,
    {
      success: false,
      error: false,
    },
  );
  const [isSubmitting, startTransition] = useTransition();
  const [mode, setMode] = useState<"existing" | "new">(
    (relatedData?.classes ?? []).some(
      (classItem) =>
        classItem.id !== data.id && classItem.gradeId === data.gradeId,
    )
      ? "existing"
      : "new",
  );
  const [selectedClassId, setSelectedClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [newClassCapacity, setNewClassCapacity] = useState(
    String(Math.max(data._count?.students ?? 0, 1)),
  );
  const [newClassGradeId, setNewClassGradeId] = useState(String(data.gradeId));
  const [newClassSupervisorId, setNewClassSupervisorId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const studentCount = data._count?.students ?? 0;

  const availableClasses = useMemo(
    () =>
      (relatedData?.classes ?? []).filter(
        (classItem) =>
          classItem.id !== data.id && classItem.gradeId === data.gradeId,
      ),
    [data.gradeId, data.id, relatedData?.classes],
  );

  const grades = relatedData?.grades ?? [];
  const teachers = relatedData?.teachers ?? [];

  const effectiveSelectedClassId =
    selectedClassId || String(availableClasses[0]?.id ?? "");

  useEffect(() => {
    if (state.success) {
      toast(
        studentCount > 0
          ? t("deletedAndReassigned")
          : t("deleted"),
      );
      setOpen(false);
      router.refresh();
    }
  }, [router, setOpen, state.success, studentCount]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    let payload: ClassDeletePayload | null = null;

    if (studentCount === 0) {
      payload = { classId: data.id };
    } else if (mode === "existing") {
      const parsedTargetClassId = Number(effectiveSelectedClassId);
      if (!parsedTargetClassId || Number.isNaN(parsedTargetClassId)) {
        setError(t("selectTargetError"));
        return;
      }

      payload = {
        classId: data.id,
        strategy: "existing",
        targetClassId: parsedTargetClassId,
      };
    } else {
      const parsedCapacity = Number(newClassCapacity);
      const parsedGradeId = Number(newClassGradeId);

      if (!newClassName.trim()) {
        setError(t("nameRequired"));
        return;
      }

      if (
        !parsedCapacity ||
        Number.isNaN(parsedCapacity) ||
        parsedCapacity < 1
      ) {
        setError(t("capacityRequired"));
        return;
      }

      if (!parsedGradeId || Number.isNaN(parsedGradeId)) {
        setError(t("gradeRequired"));
        return;
      }

      payload = {
        classId: data.id,
        strategy: "new",
        newClass: {
          name: newClassName.trim(),
          capacity: parsedCapacity,
          gradeId: parsedGradeId,
          supervisorId: newClassSupervisorId || undefined,
        },
      };
    }

    if (!payload) return;

    startTransition(() => {
      formAction(payload);
    });
  };

  return (
    <form className="flex flex-col gap-6 p-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-2">
        <h1 className="font-bold text-gray-900 text-2xl">{t("title")}</h1>
        <p className="text-gray-500 text-sm">
          {studentCount > 0
            ? t("hasStudents", { count: studentCount })
            : t("noStudents")}
        </p>
      </div>

      {studentCount > 0 ? (
        <>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={`rounded-md px-4 py-2 text-sm border ${mode === "existing" ? "bg-academixSky border-academixSky" : "bg-white border-gray-300"}`}
            >
              {t("moveExisting")}
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`rounded-md px-4 py-2 text-sm border ${mode === "new" ? "bg-academixSky border-academixSky" : "bg-white border-gray-300"}`}
            >
              {t("createNew")}
            </button>
          </div>

          {mode === "existing" ? (
            <div className="flex flex-col gap-2">
              <label className="font-medium text-gray-700 text-sm">
                {t("targetClass")}
              </label>
              <select
                className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
                value={effectiveSelectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">{t("selectExisting")}</option>
                {availableClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.name} -{" "}
                    {commonT("gradeLevel", {
                      level: classItem.grade?.level ?? classItem.gradeId,
                    })}{" "}
                    (
                    {classItem._count?.students ?? 0}/{classItem.capacity})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="gap-4 grid grid-cols-1 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  {t("newClassName")}
                </span>
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
                  placeholder={t("newClassPlaceholder")}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  {t("capacity")}
                </span>
                <input
                  type="number"
                  min={1}
                  value={newClassCapacity}
                  onChange={(e) => setNewClassCapacity(e.target.value)}
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  {t("grade")}
                </span>
                <select
                  value={newClassGradeId}
                  onChange={(e) => setNewClassGradeId(e.target.value)}
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
                >
                  {grades.map((grade) => (
                    <option key={grade.id} value={grade.id}>
                      {commonT("gradeLevel", { level: grade.level })}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-medium text-gray-700 text-sm">
                  {t("supervisor")}
                </span>
                <select
                  value={newClassSupervisorId}
                  onChange={(e) => setNewClassSupervisorId(e.target.value)}
                  className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all"
                >
                  <option value="">{t("noSupervisor")}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-50 p-3 rounded-md text-gray-600 text-sm">
          {t("noStudents")}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {state.error && (
        <p className="text-red-500 text-sm">
          {state.message || commonT("somethingWentWrong")}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-md text-sm"
        >
          {actionsT("close")}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-red-700 disabled:opacity-60 hover:brightness-90 px-4 py-2 rounded-md text-white text-sm transition-all"
        >
          {isSubmitting ? actionsT("deleting") : t("delete")}
        </button>
      </div>
    </form>
  );
};

export default ClassDeleteForm;


