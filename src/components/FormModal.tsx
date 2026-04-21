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
import {
  deleteAnnouncement,
  deleteClass,
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

const deleteActionMap = {
  subject: deleteSubject,
  class: deleteClass,
  teacher: deleteTeacher,
  student: deleteStudent,
  parent: deleteParent,
  exam: deleteExam,
  assignment: deleteAssignment,
  result: deleteResult,
  lesson: deleteSubject,
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
  loading: () => <h1>Loading...</h1>,
});
const StudentForm = dynamic(() => import("./forms/StudentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ParentForm = dynamic(() => import("./forms/ParentForm"), {
  loading: () => <h1>Loading...</h1>,
});
const SubjectForm = dynamic(() => import("./forms/SubjectForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ClassForm = dynamic(() => import("./forms/ClassForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ExamForm = dynamic(() => import("./forms/ExamForm"), {
  loading: () => <h1>Loading...</h1>,
});
const ResultForm = dynamic(() => import("./forms/ResultForm"), {
  loading: () => <h1>Loading...</h1>,
});
const EventForm = dynamic(() => import("./forms/EventForm"), {
  loading: () => <h1>Loading...</h1>,
});
const AnnouncementForm = dynamic(() => import("./forms/AnnouncementForm"), {
  loading: () => <h1>Loading...</h1>,
});
const MessageForm = dynamic(() => import("@/components/forms/MessageForm"), {
  loading: () => <h1>Loading...</h1>,
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

const FormModal = ({
  table,
  type,
  data,
  id,
  relatedData,
}: FormContainerProps & { relatedData?: any }) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-academixYellow"
      : type === "update"
        ? "bg-academixSky"
        : "bg-academixPurple";

  const [open, setOpen] = useState(false);

  const Form = () => {
    const [state, formAction] = useActionState(deleteActionMap[table], {
      success: false,
      error: false,
    });

    const router = useRouter();
    useEffect(() => {
      if (state.success) {
        toast(
          `${table.charAt(0).toUpperCase() + table.slice(1)} deleted successfully`,
        );
        setOpen(false);
        router.refresh();
      }
    }, [state, router]);

    if (type === "delete" && id) {
      return (
        <form action={formAction} className="flex flex-col gap-4 p-4">
          <input type="hidden" name="id" defaultValue={id} />
          <span className="font-medium text-center">
            All data will be lost. Are you sure you want to delete this {table}?
          </span>
          <button className="self-center bg-red-700 px-4 py-2 rounded-md w-max text-white">
            Delete
          </button>
        </form>
      );
    }

    if (type === "create" || type === "update") {
      const form = forms[table as keyof typeof forms];

      if (!form) return <span>Form not found!</span>;

      return form(setOpen, type, data, relatedData);
    }

    return null;
  };

  return (
    <>
      <button
        className={`${size} flex items-center justify-center rounded-full ${bgColor}`}
        onClick={() => setOpen(true)}
      >
        {(() => {
          const ActionIcon = iconMap[type];
          return <ActionIcon className="w-4 h-4" />;
        })()}
      </button>
      {open && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 p-4">
          <div className="relative bg-white p-4 rounded-md w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <Form />
            <div
              className="top-4 right-4 absolute cursor-pointer"
              onClick={() => setOpen(false)}
            >
              <X className="w-4 h-4 text-gray-500" />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
