import Link from "next/link";
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
      return "bg-blue-100 text-blue-700";
    case "resolved":
      return "bg-green-100 text-green-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const filters = [
  { label: "All", href: "/admin/feedbacks" },
  { label: "Pending", href: "/admin/feedbacks?status=pending" },
  { label: "Reviewed", href: "/admin/feedbacks?status=reviewed" },
  { label: "Resolved", href: "/admin/feedbacks?status=resolved" },
  { label: "Suggestions", href: "/admin/feedbacks?type=suggestion" },
  { label: "Complaints", href: "/admin/feedbacks?type=complaint" },
];

const FeedbacksPage = async ({
  searchParams,
}: {
  searchParams?: Promise<{
    status?: string;
    type?: string;
  }>;
}) => {
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const params = await searchParams;

  const status = params?.status;
  const type = params?.type;

  const feedbacks = await prisma.feedback.findMany({
    where: {
      schoolId: user.schoolId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const pendingCount = await prisma.feedback.count({
    where: {
      schoolId: user.schoolId,
      status: "pending",
    },
  });

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);

    if (statusDiff !== 0) return statusDiff;

    return (
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
    );
  });

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Feedbacks</h1>
          <p className="text-sm text-gray-500">
            Manage suggestions and complaints from students and parents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700">
            {pendingCount} pending
          </span>

          <span className="text-sm text-gray-500">
            {sortedFeedbacks.length} shown
          </span>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive =
            (!status && !type && filter.label === "All") ||
            filter.href.includes(`status=${status}`) ||
            filter.href.includes(`type=${type}`);

          return (
            <Link
              key={filter.label}
              href={filter.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-[#7C3AED] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
        {sortedFeedbacks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center">
            <p className="text-gray-500">No feedbacks found.</p>
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
                    <div className="mb-2 flex items-center gap-2">
                      <span className="capitalize font-semibold text-gray-900">
                        {feedback.type}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
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

                  <span className="whitespace-nowrap text-sm text-gray-400">
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
                          className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-200"
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
                        className="rounded-full bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-200"
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
                          className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-700 transition hover:bg-yellow-200"
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