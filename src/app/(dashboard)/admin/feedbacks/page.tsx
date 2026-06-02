import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { updateFeedbackStatus } from "@/lib/actions/feedback";

const statusOrder: Record<string, number> = {
  pending: 1,
  reviewed: 2,
  resolved: 3,
};

const getStatusClass = (status: string) => {
  switch (status) {
    case "reviewed":
      return "bg-lamaSkyLight text-blue-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    default:
      return "bg-lamaYellowLight text-yellow-700";
  }
};

const FeedbacksPage = async () => {
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const feedbacks = await prisma.feedback.findMany({
    where: {
      schoolId: user.schoolId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="hidden md:block text-lg font-semibold">
          Feedbacks
        </h1>

        <span className="text-sm text-gray-500">
          {sortedFeedbacks.length} total
        </span>
      </div>

      <div className="space-y-4">
        {sortedFeedbacks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-500">No feedbacks yet.</p>
          </div>
        ) : (
          sortedFeedbacks.map((feedback) => {
            const isResolved = feedback.status === "resolved";

            return (
              <div
                key={feedback.id}
                className={`rounded-2xl border p-5 shadow-sm transition ${
                  isResolved
                    ? "border-green-100 bg-green-50/40 opacity-80"
                    : "border-gray-200 bg-white hover:shadow-md"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="capitalize font-semibold text-gray-900">
                        {feedback.type}
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

                {isResolved ? (
                  <p className="mt-5 text-sm text-green-700">
                    This feedback is resolved and locked.
                  </p>
                ) : (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {feedback.status !== "reviewed" && (
                      <form action={updateFeedbackStatus}>
                        <input type="hidden" name="id" value={feedback.id} />
                        <input type="hidden" name="status" value="reviewed" />

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-full bg-lamaSkyLight text-blue-700 text-sm font-medium hover:opacity-80 transition"
                        >
                          Mark Reviewed
                        </button>
                      </form>
                    )}

                    <form action={updateFeedbackStatus}>
                      <input type="hidden" name="id" value={feedback.id} />
                      <input type="hidden" name="status" value="resolved" />

                      <button
                        type="submit"
                        className="px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium hover:opacity-80 transition"
                      >
                        Mark Resolved
                      </button>
                    </form>

                    {feedback.status !== "pending" && (
                      <form action={updateFeedbackStatus}>
                        <input type="hidden" name="id" value={feedback.id} />
                        <input type="hidden" name="status" value="pending" />

                        <button
                          type="submit"
                          className="px-4 py-2 rounded-full bg-lamaYellowLight text-yellow-700 text-sm font-medium hover:opacity-80 transition"
                        >
                          Mark Pending
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default FeedbacksPage;