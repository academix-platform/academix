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
  const triggerRef = useRef<HTMLButtonElement>(null);
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
    // polling every 30 seconds
    const interval = setInterval(fetchNotifs, 30000);
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, [fetchNotifs]);

  const closeDropdown = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  // ─── Close on outside click or Escape key ──────────────────────────────────
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeDropdown(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown(true);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeDropdown]);

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
      {/* ─── Bell Button (Identical styling to Messages button) ─── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? "notification-bell-dropdown" : undefined}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-outline bg-surface text-content-secondary hover:text-content-primary hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
        aria-label={t("label")}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -end-1.5 flex items-center justify-center bg-brandPurple-600 text-white rounded-full min-w-4 h-4 px-1 text-[10px] font-bold shadow-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* ─── Dropdown ─── */}
      {open && (
        <div
          id="notification-bell-dropdown"
          role="dialog"
          aria-label={t("label")}
          className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-outline bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-80 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-outline/70 px-3 py-3 sm:items-center sm:px-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Bell className="h-4 w-4 flex-shrink-0 text-content-muted" />
              <Link
                href="/list/notifications"
                onClick={() => closeDropdown(false)}
                className="truncate text-sm font-semibold text-content-primary transition-colors hover:text-brandPurple-600"
              >
                {t("label")}
              </Link>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brandPurple-100 px-1.5 py-0.5 text-xs font-semibold text-brandPurple-700">
                  {t("newCount", { count: unreadCount })}
                </span>
              )}
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-content-muted transition-colors hover:text-brandPurple-600"
                  title={t("markAllRead")}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden min-[380px]:inline">{t("allRead")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => closeDropdown(true)}
                className="p-1 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition"
                aria-label={t("close")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[min(24rem,calc(100vh-11rem))] overflow-y-auto academix-menu-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-brandPurple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-content-muted/40 mx-auto mb-2" />
                <p className="text-sm text-content-muted">{t("empty")}</p>
              </div>
            ) : (
              <ul className="divide-y divide-outline/60">
                {notifications.map((n) => {
                  const { icon: Icon, color, bg } = TYPE_ICON[n.type] ?? TYPE_ICON.NEW_MESSAGE;
                  const content = (
                    <div
                      className={`flex cursor-pointer items-start gap-2 px-3 py-3 transition-colors sm:gap-3 sm:px-4
                                  ${n.isRead ? "bg-surface hover:bg-surface-muted" : "bg-brandPurple-50/60 hover:bg-brandPurple-50"}`}
                      onClick={() => !n.isRead && markRead(n.id)}
                    >
                      <div className={`flex-shrink-0 p-2 rounded-xl ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${n.isRead ? "text-content-secondary" : "text-content-primary"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-content-muted mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brandPurple-600 mt-1.5" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={() => { markRead(n.id); closeDropdown(false); }}>
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
          <div className="px-4 py-2.5 border-t border-outline/70 flex items-center justify-between bg-surface">
            <Link
              href="/list/notifications"
              onClick={() => closeDropdown(false)}
              className="text-xs font-semibold text-brandPurple-600 hover:text-brandPurple-700 transition-colors"
            >
              {t("viewAll")}
            </Link>
            <button
              type="button"
              onClick={() => closeDropdown(true)}
              className="text-xs text-content-muted hover:text-content-primary transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
