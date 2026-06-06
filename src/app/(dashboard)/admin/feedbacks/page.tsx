import Link from "next/link";
import Pagination from "@/components/Pagination";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { updateFeedbackStatus } from "@/lib/actions/feedback";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getTranslations } from "next-intl/server";

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
  { labelKey: "all", href: "/admin/feedbacks" },
  { labelKey: "pending", href: "/admin/feedbacks?status=pending" },
  { labelKey: "reviewed", href: "/admin/feedbacks?status=reviewed" },
  { labelKey: "resolved", href: "/admin/feedbacks?status=resolved" },
  { labelKey: "suggestions", href: "/admin/feedbacks?type=suggestion" },
  { labelKey: "complaints", href: "/admin/feedbacks?type=complaint" },
];

const FeedbacksPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const filtersT = await getTranslations("filters");
  const feedbackT = await getTranslations("feedbackPage");
  const user = await getAuthUser();

  if (!user) {
    return <div>Unauthorized</div>;
  }

  const params = await searchParams;

  const status = getQueryParam(params.status);
  const type = getQueryParam(params.type);
  const currentPage = getQueryParam(params.page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const where = {
    schoolId: user.schoolId,
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [feedbacks, count, pendingCount] = await prisma.$transaction([
    prisma.feedback.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.feedback.count({ where }),
    prisma.feedback.count({
      where: {
        schoolId: user.schoolId,
        status: "pending",
      },
    }),
  ]);

  const sortedFeedbacks = [...feedbacks].sort((a, b) => {
    const statusDiff =
      (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99);

    if (statusDiff !== 0) return statusDiff;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex md:flex-row flex-col md:justify-between md:items-center gap-4 mb-6">
        <div>
          <h1 className="font-semibold text-lg">{t("feedbacks")}</h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-yellow-100 px-4 py-2 rounded-full font-medium text-yellow-700 text-sm">
            {feedbackT("pendingCount", { count: pendingCount })}
          </span>

          <span className="text-gray-500 text-sm">
            {feedbackT("shownCount", { count })}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map((filter) => {
          const isActive =
            (!status && !type && filter.labelKey === "all") ||
            filter.href.includes(`status=${status}`) ||
            filter.href.includes(`type=${type}`);

          return (
            <Link
              key={filter.labelKey}
              href={filter.href}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-[#7C3AED] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filtersT(filter.labelKey)}
            </Link>
          );
        })}
      </div>

      <div className="space-y-4">
        {sortedFeedbacks.length === 0 ? (
          <div className="p-10 border border-gray-300 border-dashed rounded-xl text-center">
            <p className="text-gray-500">{feedbackT("noFeedbacks")}</p>
          </div>
        ) : (
          sortedFeedbacks.map((feedback) => {
            const isResolved = feedback.status === "resolved";

            return (
              <div
                key={feedback.id}
                className={`rounded-2xl flex flex-col border p-5 shadow-sm transition ${
                  isResolved
                    ? "border-green-100 bg-green-50/40 opacity-80"
                    : "border-gray-200 bg-white hover:shadow-md"
                }`}
              >
                <div className="flex md:flex-row flex-col md:justify-between md:items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 capitalize">
                        {feedback.type}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                          feedback.status,
                        )}`}
                      >
                    {filtersT(feedback.status)}
                      </span>
                    </div>

                    <p className="text-gray-600 leading-6">
                      {feedback.message}
                    </p>
                  </div>

                  <span className="text-gray-400 text-sm whitespace-nowrap">
                    {new Date(feedback.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {isResolved ? (
                  <p className="mt-5 text-green-700 text-sm">
                    {feedbackT("resolvedLocked")}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 mt-5 ms-auto">
                    {feedback.status !== "reviewed" && (
                      <form action={updateFeedbackStatus}>
                        <input type="hidden" name="id" value={feedback.id} />
                        <input type="hidden" name="status" value="reviewed" />

                        <button
                          type="submit"
                          className="bg-blue-100 hover:bg-blue-200 px-4 py-2 rounded-md font-medium text-blue-700 text-sm transition"
                        >
                          {feedbackT("markReviewed")}
                        </button>
                      </form>
                    )}

                    <form action={updateFeedbackStatus}>
                      <input type="hidden" name="id" value={feedback.id} />
                      <input type="hidden" name="status" value="resolved" />

                      <button
                        type="submit"
                        className="bg-green-100 hover:bg-green-200 px-4 py-2 rounded-md font-medium text-green-700 text-sm transition"
                      >
                        {feedbackT("markResolved")}
                      </button>
                    </form>

                    {feedback.status !== "pending" && (
                      <form action={updateFeedbackStatus}>
                        <input type="hidden" name="id" value={feedback.id} />
                        <input type="hidden" name="status" value="pending" />

                        <button
                          type="submit"
                          className="bg-yellow-100 hover:bg-yellow-200 px-4 py-2 rounded-md font-medium text-yellow-700 text-sm transition"
                        >
                          {feedbackT("markPending")}
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

      <Pagination page={p} count={count} />
    </div>
  );
};

export default FeedbacksPage;
