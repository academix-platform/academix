"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, X, CheckCheck, ClipboardList, MessageSquare, Megaphone, BookOpen, Mail, BarChart3, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function NotificationBell() {
  const t = useTranslations("navbar.notifications");
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifs]    = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(fetchNotifs, 0);
    // polling كل 30 ثانية
    const interval = setInterval(fetchNotifs, 30000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  // ─── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // ─── Mark single as read ─────────────────────────────────────────────────────
  async function markRead(id: number) {
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  // ─── Mark all as read ────────────────────────────────────────────────────────
  async function markAllRead() {
    setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ─── Bell Button ─── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative w-7 h-7 flex items-center justify-center"
        aria-label={t("label")}
      >
        <Bell className="w-5 h-5 text-gray-600 hover:scale-[1.05] transition" />
        {unreadCount > 0 && (
          <span className="absolute -top-2.5 -end-1.5 flex items-center justify-center
                           bg-academixPurpleDark text-white rounded-full w-5 h-5 text-xs font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div className="absolute end-0 top-10 z-50 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <Link
                href="/list/notifications"
                onClick={() => setOpen(false)}
                className="font-semibold text-sm text-gray-800 hover:text-purple-600 transition-colors"
              >
                {t("label")}
              </Link>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  {t("newCount", { count: unreadCount })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-purple-600 transition-colors"
                  title={t("markAllRead")}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t("allRead")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">{t("empty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {notifications.map((n) => {
                  const { icon: Icon, color, bg } = TYPE_ICON[n.type] ?? TYPE_ICON.NEW_MESSAGE;
                  const content = (
                    <div
                      className={`flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer
                                  ${n.isRead ? "bg-white hover:bg-gray-50" : "bg-purple-50 hover:bg-purple-100"}`}
                      onClick={() => !n.isRead && markRead(n.id)}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-xl ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${n.isRead ? "text-gray-700" : "text-gray-900"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => { markRead(n.id); setOpen(false); }}>
                          {content}
                        </Link>
                      ) : content}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between">
            <Link
              href="/list/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-purple-600 hover:text-purple-800 transition-colors"
            >
              {t("viewAll")}
            </Link>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
