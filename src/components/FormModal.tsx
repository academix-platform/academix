"use client";

import {
  Dispatch,
  type ReactElement,
  SetStateAction,
  useActionState,
  useEffect,
  useState,
} from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import { useFormStatus } from "react-dom";
import {
  deleteAnnouncement,
  deleteClass,
  deleteGrade,
  deleteAssignment,
  deleteExam,
  deleteEvent,
  deleteMessage,
  deleteParent,
  deleteStudent,
  deleteSubject,
  deleteTeacher,
  deleteResult,
} from "@/lib/actions";
import { useRouter } from "next/navigation";
import { FormContainerProps } from "./FormContainer";
import AssignmentForm from "./forms/AssignmentForm";
import ClassDeleteForm from "./forms/ClassDeleteForm";
import { useLocale, useTranslations } from "next-intl";
import { localizeValidationError } from "@/lib/validationLocalization";

const DynamicFormLoading = () => {
  const t = useTranslations("states");
  return <h1>{t("loading")}</h1>;
};

const deleteActionMap = {
  grade: deleteGrade,
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  parent: deleteParent,
  exam: deleteExam,
  assignment: deleteAssignment,
  result: deleteResult,
  lesson: deleteStudent,
  attendance: deleteSubject,
  event: deleteEvent,
  announcement: deleteAnnouncement,
  message: deleteMessage,
};

const iconMap = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
  loading: () => <DynamicFormLoading />,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <DynamicFormLoading />,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <DynamicFormLoading />,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <DynamicFormLoading />,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <DynamicFormLoading />,
});
const GradeForm = dynamic(() => import("./forms/GradeForm"), {
  loading: () => <DynamicFormLoading />,
});
const LessonForm = dynamic(() => import("./forms/LessonForm"), {
  loading: () => <DynamicFormLoading />,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <DynamicFormLoading />,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <DynamicFormLoading />,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <DynamicFormLoading />,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <DynamicFormLoading />,
});
const MessageForm = dynamic(() => import("@/components/forms/MessageForm"), {
  loading: () => <DynamicFormLoading />,
});
const StudentDeleteForm = dynamic(() => import("./forms/StudentDeleteForm"), {
  loading: () => <DynamicFormLoading />,
});
const GradeDeleteForm = dynamic(() => import("./forms/GradeDeleteForm"), {
  loading: () => <DynamicFormLoading />,
});

const forms: {
  [key: string]: (
    setOpen: Dispatch<SetStateAction<boolean>>,
    type: "create" | "update",
    data?: any,
    relatedData?: any,
  ) => ReactElement;
} = {
  teacher: (setOpen, type, data, relatedData) => (
    <TeacherForm
      type={type}
      data={data}
      setOpen={setOpen}
      relatedData={relatedData}
    />
  ),
  student: (setOpen, type, data, relatedData) => (
    <StudentForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  parent: (setOpen, type, data, relatedData) => (
    <ParentForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  subject: (setOpen, type, data, relatedData) => (
    <SubjectForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  class: (setOpen, type, data, relatedData) => (
    <ClassForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  grade: (setOpen, type, data, relatedData) => (
    <GradeForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  lesson: (setOpen, type, data, relatedData) => (
    <LessonForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  exam: (setOpen, type, data, relatedData) => (
    <ExamForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  assignment: (setOpen, type, data, relatedData) => (
    <AssignmentForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  result: (setOpen, type, data, relatedData) => (
    <ResultForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  event: (setOpen, type, data, relatedData) => (
    <EventForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  announcement: (setOpen, type, data, relatedData) => (
    <AnnouncementForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
  message: (setOpen, type, data, relatedData) => (
    <MessageForm
      setOpen={setOpen}
      type={type}
      data={data}
      relatedData={relatedData}
    />
  ),
};

const DeleteSubmitButton = () => {
  const t = useTranslations("actions");
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="self-center bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-semibold w-max text-white shadow-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
    >
      {pending ? t("deleting") : t("delete")}
    </button>
  );
};

const ModalBody = ({
  table,
  type,
  data,
  id,
  relatedData,
  setOpen,
}: FormContainerProps & {
  relatedData?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
}) => {
  const t = useTranslations("actions");
  const tableT = useTranslations("tables");
  const locale = useLocale();
  const [state, formAction] = useActionState(deleteActionMap[table], {
    success: false,
    error: false,
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(t("deleteSuccess", { entity: tableT(table) }));
      setOpen(false);
      router.refresh();
    } else if (state.error) {
      toast.error(
        localizeValidationError(state.message, locale) || t("somethingWentWrong"),
      );
    }
  }, [state, router, setOpen, t, table, tableT, locale]);

  if (type === "delete" && id) {
    if (table === "class") {
      return (
        <ClassDeleteForm
          data={data}
          relatedData={relatedData}
          setOpen={setOpen}
        />
      );
    }
    if (table === "grade") {
      return (
        <GradeDeleteForm
          data={data}
          relatedData={relatedData}
          setOpen={setOpen}
        />
      );
    }

    if (table === "student") {
      return (
        <StudentDeleteForm
          data={data}
          relatedData={relatedData}
          setOpen={setOpen}
        />
      );
    }

    return (
      <form action={formAction} className="flex flex-col gap-4 p-4">
        <input type="hidden" name="id" defaultValue={id} />
        <span className="font-medium text-center">
          {t("deleteConfirmation", { entity: tableT(table) })}
        </span>
        <DeleteSubmitButton />
      </form>
    );
  }

  if (type === "create" || type === "update") {
    const form = forms[table as keyof typeof forms];

    if (!form) return <span>{t("formNotFound")}</span>;

    return form(setOpen, type, data, relatedData);
  }

  return null;
};

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const t = useTranslations("actions");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const buttonTypeStyles = {
    create:
      "bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs",
    update:
      "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700",
    delete:
      "bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
  };

  return (
    <>
      <button
        type="button"
        className={`p-2 flex items-center justify-center rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${buttonTypeStyles[type]}`}
        onClick={() => setOpen(true)}
        title={t(type)}
        aria-label={t(type)}
      >
        {(() => {
          const ActionIcon = iconMap[type];
          return <ActionIcon className="w-4 h-4" />;
        })()}
      </button>
      {open && (
        <div
          className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in-0 duration-200"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <ModalBody
              table={table}
              type={type}
              data={data}
              id={id}
              relatedData={relatedData}
              setOpen={setOpen}
            />
            <button
              type="button"
              aria-label="Close dialog"
              className="top-5 absolute hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition end-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
