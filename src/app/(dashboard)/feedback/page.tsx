import { createFeedback } from "@/lib/actions/feedback";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const getStatusClass = (status: string) => {
  switch (status) {
    case "reviewed":
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case "complaint":
      return "Complaint";
    default:
      return "Suggestion";
  }
};

export default async function FeedbackPage() {
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      schoolId: user.schoolId,
      userId: user.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="hidden md:block text-lg font-semibold">
          Suggestions & Complaints
        </h1>

        <span className="text-sm text-gray-500">
          {feedbacks.length} submitted
        </span>
      </div>

      <form
        action={createFeedback}
        className="mb-8 max-w-2xl rounded-2xl border border-[#DDD6FE] bg-[#F5F3FF] p-5 shadow-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Type
            </label>

            <select
              name="type"
              required
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED]"
            >
              <option value="suggestion">Suggestion</option>
              <option value="complaint">Complaint</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Message
            </label>

            <textarea
              name="message"
              required
              placeholder="Write your message..."
              className="w-full h-36 resize-none rounded-lg border border-gray-300 bg-white p-3 text-sm outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-[#7C3AED] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#6D28D9]"
            >
              Send Feedback
            </button>
          </div>
        </div>
      </form>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">My Feedback History</h2>

          <span className="text-xs text-gray-400">
            Track your submitted feedback status
          </span>
        </div>

        <div className="space-y-4">
          {feedbacks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500 text-sm">
                You have not submitted any feedback yet.
              </p>
            </div>
          ) : (
            feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900">
                        {getTypeLabel(feedback.type)}
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusClass(
                          feedback.status
                        )}`}
                      >
                        {feedback.status}
                      </span>
                    </div>

                    <p className="text-gray-600 leading-6">
                      {feedback.message}
                    </p>
                  </div>

                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}