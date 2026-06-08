// src/app/(dashboard)/list/notifications/page.tsx
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma } from "@prisma/client";
import NotificationsClient from "./NotificationsClient";

const TYPE_OPTIONS = [
  { value: "",                    labelKey: "allTypes"          },
  { value: "NEW_ASSIGNMENT",      labelKey: "assignments"       },
  { value: "ASSIGNMENT_UPDATED",  labelKey: "assignmentUpdates" },
  { value: "ASSIGNMENT_FEEDBACK", labelKey: "feedback"          },
  { value: "NEW_EXAM",            labelKey: "exams"             },
  { value: "GRADE_POSTED",        labelKey: "grades"            },
  { value: "GRADE_UPDATED",       labelKey: "gradeUpdates"      },
  { value: "NEW_ANNOUNCEMENT",    labelKey: "announcements"     },
  { value: "NEW_EVENT",           labelKey: "events"            },
  { value: "SCHEDULE_UPDATED",    labelKey: "schedule"          },
  { value: "ATTENDANCE_SAVED",    labelKey: "attendance"        },
  { value: "SUPERVISOR_ASSIGNED", labelKey: "supervisor"        },
  { value: "NEW_MESSAGE",         labelKey: "messages"          },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const { userId } = await enforceRouteAccess("/list/notifications");
  const resolved = await searchParams;

  const p      = parseInt(getQueryParam(resolved.page)   ?? "1");
  const search = getQueryParam(resolved.search) ?? "";
  const type   = getQueryParam(resolved.type)   ?? "";
  const sort   = getQueryParam(resolved.sort)   ?? "desc";

  const where: Prisma.NotificationWhereInput = {
    userId,
    ...(type   ? { type: type as any } : {}),
    ...(search ? { OR: [
      { title: { contains: search, mode: "insensitive" } },
      { body:  { contains: search, mode: "insensitive" } },
    ]} : {}),
  };

  const [notifications, count, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: sort === "asc" ? "asc" : "desc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <NotificationsClient
        notifications={notifications.map(n => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        }))}
        count={count}
        page={p}
        unreadCount={unreadCount}
        typeOptions={TYPE_OPTIONS}
        currentSearch={search}
        currentType={type}
        currentSort={sort}
      />
    </div>
  );
}
