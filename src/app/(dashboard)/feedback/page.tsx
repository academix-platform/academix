import FeedbackModal from "@/components/FeedbackModal";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/states/EmptyState";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getAuthUser } from "@/lib/auth";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getTranslations } from "next-intl/server";

const getTypeLabel = (type: string, t: (key: string) => string) => {
  switch (type) {
    case "complaint":
      return t("types.complaint");
    default:
      return t("types.suggestion");
  }
};

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const feedbackT = await getTranslations("feedbackPage");
  const filtersT = await getTranslations("filters");
  const sidebarT = await getTranslations("sidebar.items");
  const user = await getAuthUser();

  if (!user) {
    return <div>{feedbackT("unexpectedError")}</div>;
  }

  const resolvedSearchParams = await searchParams;
  const currentPage = getQueryParam(resolvedSearchParams.page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const where = {
    schoolId: user.schoolId,
    userId: user.userId,
  };

  const [feedbacks, count] = await prisma.$transaction([
    prisma.feedback.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.feedback.count({ where }),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("feedback"), isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <DataPageHeader
        title={feedbackT("historyTitle")}
        description={feedbackT("historyDescription")}
        count={count}
        actions={<FeedbackModal />}
      />

      {/* Feedback History Cards */}
      <div className="space-y-4">
        {feedbacks.length === 0 ? (
          <div className="bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs">
            <EmptyState
              title={feedbackT("emptyHistory")}
              description={feedbackT("historyDescription")}
            />
          </div>
        ) : (
          feedbacks.map((feedback) => (
            <div
              key={feedback.id}
              className="rounded-2xl border border-outline/80 bg-surface p-5 md:p-6 shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-bold text-base text-content-primary">
                    {getTypeLabel(feedback.type, feedbackT)}
                  </span>

                  <Badge
                    variant={
                      feedback.status === "resolved"
                        ? "success"
                        : feedback.status === "reviewed"
                        ? "info"
                        : "warning"
                    }
                    size="sm"
                    className="font-semibold"
                  >
                    {filtersT(feedback.status)}
                  </Badge>
                </div>

                <span className="text-xs text-content-muted">
                  {new Date(feedback.createdAt).toLocaleDateString()}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
                {feedback.message}
              </p>
            </div>
          ))
        )}
      </div>

      <Pagination page={p} count={count} />
    </div>
  );
}
