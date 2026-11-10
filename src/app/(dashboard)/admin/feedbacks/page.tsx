import Link from "next/link";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/states/EmptyState";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { updateFeedbackStatus } from "@/lib/actions/feedback";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

const statusOrder: Record<string, number> = {
  pending: 1,
  reviewed: 2,
  resolved: 3,
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
  const sidebarT = await getTranslations("sidebar.items");
  const user = await getAuthUser();

  if (!user) {
    return <div>{feedbackT("unauthorized")}</div>;
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("feedbacks"), isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <DataPageHeader
        title={t("feedbacks")}
        count={count}
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant={pendingCount > 0 ? "warning" : "secondary"}
              size="sm"
              className="font-semibold"
            >
              {feedbackT("pendingCount", { count: pendingCount })}
            </Badge>
          </div>
        }
      />

      {/* Filter Tabs Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 sm:p-4 bg-surface border border-outline/80 rounded-2xl shadow-2xs">
        {filters.map((filter) => {
          const isActive =
            (!status && !type && filter.labelKey === "all") ||
            (status && filter.href.includes(`status=${status}`)) ||
            (type && filter.href.includes(`type=${type}`));

          return (
            <Link
              key={filter.labelKey}
              href={filter.href}
              className={cn(
                "inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-2xs",
                isActive
                  ? "bg-brandPurple-600 text-white shadow-brandPurple-500/20 ring-2 ring-brandPurple-600/30 font-bold"
                  : "bg-surface border border-outline/80 text-content-secondary hover:text-content-primary hover:bg-surface-muted hover:border-outline"
              )}
            >
              {filtersT(filter.labelKey)}
            </Link>
          );
        })}
      </div>

      {/* Feedbacks List */}
      <div className="space-y-4">
        {sortedFeedbacks.length === 0 ? (
          <div className="bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs">
            <EmptyState
              title={feedbackT("noFeedbacks")}
              description={feedbackT("emptyHistory")}
            />
          </div>
        ) : (
          sortedFeedbacks.map((feedback) => {
            const isResolved = feedback.status === "resolved";

            return (
              <div
                key={feedback.id}
                className={cn(
                  "rounded-2xl flex flex-col border p-5 md:p-6 shadow-2xs transition-all space-y-4",
                  isResolved
                    ? "border-outline/70 bg-surface/80 opacity-85"
                    : "border-outline/80 bg-surface hover:border-brandPurple-200 dark:hover:border-brandPurple-800"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-bold text-base text-content-primary">
                      {feedbackT(`types.${feedback.type}`)}
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

                {isResolved ? (
                  <div className="flex items-center gap-1.5 pt-3 border-t border-outline/60 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                    <span>{feedbackT("resolvedLocked")}</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-outline/60 ms-auto">
                    {feedback.status !== "reviewed" && (
                      <form action={updateFeedbackStatus}>
                        <input type="hidden" name="id" value={feedback.id} />
                        <input type="hidden" name="status" value="reviewed" />

                        <button
                          type="submit"
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-all shadow-2xs"
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
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
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
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-all shadow-2xs"
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
