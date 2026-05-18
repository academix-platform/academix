"use client";

import { useState, useEffect } from "react";
import { X, Download, Users, FileText, CheckCircle, Clock } from "lucide-react";

type Submission = {
  id: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  note: string | null;
  createdAt: Date;
  student: {
    id: string;
    name: string;
      img: string | null;
  };
};

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  totalStudents: number;
};

export default function SubmissionsModal({
  assignmentId,
  assignmentTitle,
  totalStudents,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/submissions?assignmentId=${assignmentId}`)
      .then((r) => r.json())
      .then((data) => setSubmissions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [open, assignmentId]);

  const submitted = submissions.length;
  const notSubmitted = totalStudents - submitted;

  return (
    <>
      {/* زر فتح */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                   bg-indigo-50 text-indigo-700 hover:bg-indigo-100
                   transition-colors text-xs font-medium"
      >
        <Users className="w-3.5 h-3.5" />
        Submissions
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800 text-base">
                  Student Submissions
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">
                  {assignmentTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-3 px-6 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {submitted} Submitted
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">
                  {notSubmitted} Pending
                </span>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-10">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-medium">
                    No submissions yet
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Students haven't submitted anything for this assignment.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {submissions.map((s) => (
                    <li key={s.id} className="flex items-start gap-3 py-3">
                      {/* صورة الطالب */}
                      {s.student.img ? (
                        <img
                          src={s.student.img}
                          alt={s.student.name}
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center
                                        text-indigo-700 font-semibold text-xs flex-shrink-0 mt-0.5">
                          {s.student.name[0]}
                        </div>
                      )}

                      {/* معلومات التسليم */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">
                          {s.student.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <FileText className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 truncate max-w-[180px]">
                            {s.fileName}
                          </span>
                        </div>
                        {s.note && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2 italic">
                            "{s.note}"
                          </p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(s.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>

                      {/* زر تحميل */}
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={s.fileName}
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400
                                   hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Download submission"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full py-2 rounded-lg border border-gray-200
                           text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}