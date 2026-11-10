"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Bell,
  ClipboardList,
  MessageSquare,
  Megaphone,
  BookOpen,
  Mail,
  CheckCheck,
  Search,
  Filter,
  Clock,
  CheckCircle,
  ArrowUpDown,
  Trash2,
  BarChart3,
  Calendar,
  Users,
} from "lucide-react";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/states/EmptyState";
import { DataPageHeader } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type NotificationType =
  | "NEW_ASSIGNMENT"
  | "ASSIGNMENT_UPDATED"
  | "ASSIGNMENT_SUBMITTED"
  | "ASSIGNMENT_FEEDBACK"
  | "NEW_EXAM"
  | "GRADE_POSTED"
  | "GRADE_UPDATED"
  | "NEW_ANNOUNCEMENT"
  | "NEW_EVENT"
  | "SCHEDULE_UPDATED"
  | "ATTENDANCE_SAVED"
  | "SUPERVISOR_ASSIGNED"
  | "NEW_MESSAGE";

type Notification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

type TypeOption = { value: string; labelKey: string };

type Props = {
  notifications: Notification[];
  count: number;
  page: number;
  unreadCount: number;
  typeOptions: TypeOption[];
  currentSearch: string;
  currentType: string;
  currentSort: string;
};

const TYPE_ICON: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  NEW_ASSIGNMENT:       { icon: ClipboardList, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40" },
  ASSIGNMENT_UPDATED:   { icon: ClipboardList, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40" },
  ASSIGNMENT_SUBMITTED: { icon: ClipboardList, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40" },
  ASSIGNMENT_FEEDBACK:  { icon: MessageSquare, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40" },
  NEW_EXAM:             { icon: BookOpen,      color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/40" },
  GRADE_POSTED:         { icon: BarChart3,     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40" },
  GRADE_UPDATED:        { icon: BarChart3,     color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-900/40" },
  NEW_ANNOUNCEMENT:     { icon: Megaphone,     color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/50 border border-purple-100 dark:border-purple-900/40" },
  NEW_EVENT:            { icon: Calendar,      color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40" },
  SCHEDULE_UPDATED:     { icon: Calendar,      color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-900/40" },
  ATTENDANCE_SAVED:     { icon: CheckCheck,    color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-100 dark:border-cyan-900/40" },
  SUPERVISOR_ASSIGNED:  { icon: Users,         color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/50 border border-violet-100 dark:border-violet-900/40" },
  NEW_MESSAGE:          { icon: Mail,          color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (days  >= 1) return `${days}d ago`;
  if (hours >= 1) return `${hours}h ago`;
  if (mins  >= 1) return `${mins}m ago`;
  return "Just now";
}

export default function NotificationsClient({
  notifications: initialNotifs,
  count,
  page,
  unreadCount: initialUnread,
  typeOptions,
  currentSearch,
  currentType,
  currentSort,
}: Props) {
  const t = useTranslations("pages");
  const commonT = useTranslations("common");
  const filtersT = useTranslations("filters");
  const actionsT = useTranslations("actions");
  const emptyT = useTranslations("emptyStates");
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [notifications, setNotifs]     = useState(initialNotifs);
  const [unreadCount,   setUnreadCount] = useState(initialUnread);
  const [search,        setSearch]      = useState(currentSearch);

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v); else params.delete(k);
    });
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params}`));
  }

  async function markRead(id: number) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  async function deleteOne(id: number) {
    setNotifs((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => {
      const wasUnread = notifications.find((n) => n.id === id && !n.isRead);
      return wasUnread ? Math.max(0, c - 1) : c;
    });
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function deleteAll() {
    setNotifs([]);
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteAll: true }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DataPageHeader
        title={t("allNotifications")}
        count={count}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={markAllRead}
                leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
              >
                {actionsT("markAllRead")}
              </Button>
            )}

            {notifications.length > 0 && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={deleteAll}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                {actionsT("deleteAll")}
              </Button>
            )}
          </div>
        }
      />

      {/* Toolbar: Search, Type Filter, Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 sm:p-4 bg-surface border border-outline/80 rounded-2xl shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-subtle" />
          <input
            type="text"
            placeholder={commonT("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && navigate({ search })}
            className="w-full ps-9 pe-4 py-2 text-xs sm:text-sm bg-surface-muted/50 border border-outline/80 rounded-xl outline-none focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 text-content-primary placeholder:text-content-muted transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Type Filter */}
          <div className="relative">
            <select
              value={currentType}
              onChange={(e) => navigate({ type: e.target.value })}
              className="appearance-none ps-3 pe-8 py-2 text-xs sm:text-sm bg-surface-muted/50 border border-outline/80 rounded-xl outline-none focus:border-brandPurple-500 focus:ring-2 focus:ring-brandPurple-500/20 text-content-secondary font-medium cursor-pointer transition-all"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-surface text-content-primary">
                  {filtersT(opt.labelKey)}
                </option>
              ))}
            </select>
            <Filter className="absolute end-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-subtle pointer-events-none" />
          </div>

          {/* Sort Toggle */}
          <button
            type="button"
            onClick={() => navigate({ sort: currentSort === "desc" ? "asc" : "desc" })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium bg-surface-muted/50 border border-outline/80 rounded-xl text-content-secondary hover:text-content-primary hover:bg-surface-muted transition-all"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-content-subtle" />
            <span className="hidden sm:inline">
              {currentSort === "desc" ? filtersT("newest") : filtersT("oldest")}
            </span>
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      {isPending ? (
        <div className="flex items-center justify-center py-20 bg-surface border border-outline/80 rounded-2xl shadow-2xs">
          <div className="w-7 h-7 border-3 border-brandPurple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-surface border border-outline/80 rounded-2xl p-6 md:p-8 shadow-2xs">
          <EmptyState
            title={emptyT("notifications")}
            description={emptyT("filterDescription")}
          />
        </div>
      ) : (
        <div className="bg-surface border border-outline/80 rounded-2xl shadow-2xs overflow-hidden">
          <ul className="divide-y divide-outline/60">
            {notifications.map((n) => {
              const { icon: Icon, color, bg } =
                TYPE_ICON[n.type] ?? TYPE_ICON.NEW_MESSAGE;

              const content = (
                <li
                  key={n.id}
                  className={cn(
                    "relative flex items-start gap-3.5 p-4 sm:p-5 transition-all group",
                    n.isRead
                      ? "bg-surface hover:bg-surface-muted/40"
                      : "bg-brandPurple-50/30 dark:bg-brandPurple-950/20 hover:bg-brandPurple-50/50 dark:hover:bg-brandPurple-950/30"
                  )}
                >
                  {/* Unread Accent Bar */}
                  {!n.isRead && (
                    <div className="absolute start-0 top-0 bottom-0 w-1 bg-brandPurple-600 rounded-s" />
                  )}

                  {/* Icon */}
                  <div className={cn("p-2.5 rounded-xl shrink-0 mt-0.5 shadow-2xs", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>

                  {/* Body Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <p
                          className={cn(
                            "text-sm tracking-tight truncate",
                            n.isRead
                              ? "font-medium text-content-primary"
                              : "font-bold text-content-primary"
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-brandPurple-600 shrink-0" />
                        )}
                      </div>

                      {/* Timestamp & Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-content-muted flex items-center gap-1">
                          <Clock className="w-3 h-3 text-content-subtle" />
                          {timeAgo(n.createdAt)}
                        </span>

                        <div className="flex items-center gap-1 ms-2">
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markRead(n.id);
                              }}
                              className="p-1.5 rounded-lg text-content-muted hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                              title="Mark as read"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteOne(n.id);
                            }}
                            className="p-1.5 rounded-lg text-content-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-content-secondary line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                </li>
              );

              return n.link ? (
                <a
                  key={n.id}
                  href={n.link}
                  onClick={() => markRead(n.id)}
                  className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
                >
                  {content}
                </a>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </ul>
        </div>
      )}

      {/* Pagination */}
      {count > 0 && <Pagination page={page} count={count} />}
    </div>
  );
}
