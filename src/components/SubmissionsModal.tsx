"use client";

import { useState, useEffect } from "react";
import { X, Download, Users, FileText, CheckCircle, Clock, MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { updateTeacherFeedback } from "@/lib/actions/submission.actions";

type Submission = {
  id: number;
  fileUrl: string;
  fileName: string;
  fileType: string;
  note: string | null;
  teacherFeedback: string | null;
  createdAt: Date;
  updatedAt: Date;
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
  endDate: Date; // ✅ لحساب التسليم المتأخر
};


// ─── دالة حساب الفرق بين وقتين ─────────────────────────────────────────────
function getTimeDiff(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime();
  const absDiff = Math.abs(diffMs);
  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);
  if (days >= 1) return `${days} day${days > 1 ? "s" : ""}`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${mins} minute${mins > 1 ? "s" : ""}`;
}

export default function SubmissionsModal({
  assignmentId,
  assignmentTitle,
  totalStudents,
  endDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [submissions, setSubmissions] =  useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    submissionId: number;
    studentName: string;
  } | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [saving, setSaving] = useState(false);

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
  const isDeadlinePassed = new Date() > new Date(endDate);

  async function handleSaveFeedback() {
    if (!feedbackModal) return;
    setSaving(true);
    const result = await updateTeacherFeedback(feedbackModal.submissionId, feedbackText);
    setSaving(false);
    if (result.success) {
      toast.success(result.message);
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === feedbackModal.submissionId
            ? { ...s, teacherFeedback: feedbackText }
            : s
        )
      );
      setFeedbackModal(null);
    } else {
      toast.error(result.message);
    }
  }

  return (
    <>
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

            {/* Deadline Banner */}
            {isDeadlinePassed && (
              <div className="flex items-center gap-2 px-6 py-2 bg-red-50 border-b border-red-100">
                <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-medium">
                  Deadline passed — ready for grading
                </p>
                <span className="ml-auto text-xs text-red-400">
                  {new Date(endDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            )}

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
                      {/* Student avatar */}
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

                      {/* Submission info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">
                            {s.student.name}
                          </p>
                          {new Date(s.updatedAt) > new Date(endDate) ? (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-medium">
                              <Clock className="w-2.5 h-2.5" />
                              Late (+{getTimeDiff(new Date(endDate), new Date(s.updatedAt))})
                            </span>
                          ) : (
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                              <CheckCircle className="w-2.5 h-2.5" />
                              {getTimeDiff(new Date(s.updatedAt), new Date(endDate))} early
                            </span>
                          )}
                        </div>
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

                      {/* زر التحميل المعدل ليستخدم API العام /api/download مع type=submission */}
                      <a
                        href={`/api/download/${s.id}?type=submission`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-1.5 rounded-lg text-gray-400
                                   hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Download submission"
                      >
                        <Download className="w-4 h-4" />
                      </a>

                      {/* زر Feedback */}
                      <button
                        type="button"
                        onClick={() => {
                          setFeedbackModal({
                            submissionId: s.id,
                            studentName: s.student.name,
                          });
                          setFeedbackText(s.teacherFeedback ?? "");
                        }}
                        className="relative flex-shrink-0 p-1.5 rounded-lg text-gray-400
                                   hover:text-green-600 hover:bg-green-50 transition-colors"
                        title={s.teacherFeedback ? "Edit feedback" : "Add feedback"}
                      >
                        <MessageSquare className="w-4 h-4" />
                        {s.teacherFeedback && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-green-500" />
                        )}
                      </button>
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

      {/* Feedback Modal */}
      {feedbackModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                Teacher Feedback
              </h3>
              <button
                type="button"
                onClick={() => setFeedbackModal(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-3">
              Student:{" "}
              <span className="font-medium text-gray-700">
                {feedbackModal.studentName}
              </span>
            </p>

            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              placeholder="Write your feedback for this student..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                         focus:ring-2 focus:ring-indigo-300 resize-none"
            />

            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setFeedbackModal(null)}
                className="flex-1 py-2 border rounded-lg text-gray-600
                           hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeedback}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2
                           bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300
                           text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Save Feedback
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}