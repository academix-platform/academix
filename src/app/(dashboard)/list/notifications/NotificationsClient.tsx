"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Bell, ClipboardList, MessageSquare, Megaphone,
  BookOpen, Mail, CheckCheck, Search, Filter,
  Clock, CheckCircle, ArrowUpDown, Trash2,
  BarChart3, Calendar, Users,
} from "lucide-react";
import Pagination from "@/components/Pagination";
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

const TYPE_ICON: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  NEW_ASSIGNMENT:       { icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-100" },
  ASSIGNMENT_UPDATED:   { icon: ClipboardList, color: "text-amber-600",  bg: "bg-amber-100"  },
  ASSIGNMENT_SUBMITTED: { icon: ClipboardList, color: "text-green-600",  bg: "bg-green-100"  },
  ASSIGNMENT_FEEDBACK:  { icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-100" },
  NEW_EXAM:             { icon: BookOpen,      color: "text-red-600",    bg: "bg-red-100"    },
  GRADE_POSTED:         { icon: BarChart3,     color: "text-green-600",  bg: "bg-green-100"  },
  GRADE_UPDATED:        { icon: BarChart3,     color: "text-amber-600",  bg: "bg-amber-100"  },
  NEW_ANNOUNCEMENT:     { icon: Megaphone,     color: "text-purple-600", bg: "bg-purple-100" },
  NEW_EVENT:            { icon: Calendar,      color: "text-blue-600",   bg: "bg-blue-100"   },
  SCHEDULE_UPDATED:     { icon: Calendar,      color: "text-teal-600",   bg: "bg-teal-100"   },
  ATTENDANCE_SAVED:     { icon: CheckCheck,    color: "text-gray-600",   bg: "bg-gray-100"   },
  SUPERVISOR_ASSIGNED:  { icon: Users,         color: "text-violet-600", bg: "bg-violet-100" },
  NEW_MESSAGE:          { icon: Mail,          color: "text-blue-600",   bg: "bg-blue-100"   },
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
    <div className="space-y-4">
      {/* ── Header — نفس هيكلية باقي الصفحات ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allNotifications")}</h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 flex-1 md:flex-none md:min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder={commonT("search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && navigate({ search })}
              className="text-sm outline-none w-full text-gray-700 placeholder-gray-400 bg-transparent"
            />
          </div>

          <div className="flex items-center self-end gap-2">
            {/* Type filter */}
            <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select
                value={currentType}
                onChange={(e) => navigate({ type: e.target.value })}
                className="text-sm outline-none text-gray-700 bg-transparent max-w-[130px]"
              >
                {typeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {filtersT(opt.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <button
              type="button"
              onClick={() => navigate({ sort: currentSort === "desc" ? "asc" : "desc" })}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg
                         text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
              <span className="hidden sm:inline">
                {currentSort === "desc" ? filtersT("newest") : filtersT("oldest")}
              </span>
            </button>

            {/* Mark all read */}
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100
                           text-purple-700 rounded-lg text-xs font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{actionsT("markAllRead")}</span>
              </button>
            )}

            {/* Delete all */}
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={deleteAll}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100
                           text-red-600 rounded-lg text-xs font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{actionsT("deleteAll")}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── List ── */}
      {isPending ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bell className="w-12 h-12 text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium text-sm">
            {emptyT("notifications")}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {emptyT("filterDescription")}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {notifications.map((n) => {
            const { icon: Icon, color, bg } = TYPE_ICON[n.type] ?? TYPE_ICON.NEW_MESSAGE;
            const row = (
              <li
                key={n.id}
                className={`flex items-start gap-3 py-3 transition-colors
                            ${n.isRead ? "hover:bg-gray-50" : "bg-purple-50 hover:bg-purple-100"}`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 p-2 rounded-xl ${bg} mt-0.5`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium truncate ${n.isRead ? "text-gray-700" : "text-gray-900"}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs text-gray-400 hidden sm:flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(n.createdAt)}
                      </span>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => markRead(n.id)}
                          className="p-1 rounded text-gray-400 hover:text-green-600 transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); deleteOne(n.id); }}
                        className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <span className="text-xs text-gray-400 sm:hidden mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(n.createdAt)}
                  </span>
                </div>

                {/* Unread dot */}
                {!n.isRead && (
                  <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-2" />
                )}
              </li>
            );

            return n.link ? (
              <a key={n.id} href={n.link} onClick={() => markRead(n.id)} className="block">
                {row}
              </a>
            ) : <div key={n.id}>{row}</div>;
          })}
        </ul>
      )}

      {/* Pagination */}
      {count > 0 && <Pagination page={page} count={count} />}
    </div>
  );
}
