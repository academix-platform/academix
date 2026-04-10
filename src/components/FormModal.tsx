"use client";

import { type ReactElement, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

// USE LAZY LOADING

import TeacherForm from "./forms/TeacherForm";
import StudentForm from "./forms/StudentForm";

const iconMap = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

// const TeacherForm = dynamic(() => import("./forms/TeacherForm"), {
//   loading: () => <h1>Loading...</h1>,
// });
// const StudentForm = dynamic(() => import("./forms/StudentForm"), {
//   loading: () => <h1>Loading...</h1>,
// });

const forms: {
  [key: string]: (
    type: "create" | "update",
    data?: any,
  ) => ReactElement;
} = {
  teacher: (type, data) => <TeacherForm type={type} data={data} />,
  student: (type, data) => <StudentForm type={type} data={data} />,
};

const FormModal = ({
  table,
  type,
  data,
  id,
}: {
  table:
    | "teacher"
    | "student"
    | "parent"
    | "subject"
    | "class"
    | "lesson"
    | "exam"
    | "assignment"
    | "result"
    | "attendance"
    | "event"
    | "announcement";
  type: "create" | "update" | "delete";
  data?: any;
  id?: number | string;
}) => {
  const size = type === "create" ? "w-8 h-8" : "w-7 h-7";
  const bgColor =
    type === "create"
      ? "bg-academixYellow"
      : type === "update"
        ? "bg-academixSky"
        : "bg-academixPurple";

  const [open, setOpen] = useState(false);

  const renderForm = () => {
    if (type === "delete" && id) {
      return (
        <form className="flex flex-col gap-4 p-4">
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

      return form(type, data);
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
        <div className="top-0 left-0 z-50 absolute flex justify-center items-center bg-black bg-opacity-60 w-screen h-screen">
          <div className="relative bg-white p-4 rounded-md w-[90%] md:w-[70%] lg:w-[60%] 2xl:w-[40%] xl:w-[50%]">
            {renderForm()}
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
