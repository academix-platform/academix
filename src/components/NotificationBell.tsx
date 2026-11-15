"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell,
  X,
  CheckCheck,
  ClipboardList,
  MessageSquare,
  Megaphone,
  BookOpen,
  Mail,
  BarChart3,
  Calendar,
  Users,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizeNotificationBody } from "@/lib/notificationLocalization";

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

const TYPE_ICON: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  NEW_ASSIGNMENT: {
    icon: ClipboardList,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/40",
  },
  ASSIGNMENT_UPDATED: {
    icon: ClipboardList,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/40",
  },
  ASSIGNMENT_SUBMITTED: {
    icon: ClipboardList,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/40",
  },
  ASSIGNMENT_FEEDBACK: {
    icon: MessageSquare,
    color: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/50 dark:border-indigo-900/40",
  },
  NEW_EXAM: {
    icon: BookOpen,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-950/50 border border-rose-200/50 dark:border-rose-900/40",
  },
  GRADE_POSTED: {
    icon: BarChart3,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-900/40",
  },
  GRADE_UPDATED: {
    icon: BarChart3,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/50 border border-amber-200/50 dark:border-amber-900/40",
  },
  NEW_ANNOUNCEMENT: {
    icon: Megaphone,
    color: "text-brandPurple-600 dark:text-brandPurple-400",
    bg: "bg-brandPurple-50 dark:bg-brandPurple-950/50 border border-brandPurple-200/50 dark:border-brandPurple-900/40",
  },
  NEW_EVENT: {
    icon: Calendar,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/40",
  },
  SCHEDULE_UPDATED: {
    icon: Calendar,
    color: "text-teal-600 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-950/50 border border-teal-200/50 dark:border-teal-900/40",
  },
  ATTENDANCE_SAVED: {
    icon: CheckCheck,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-50 dark:bg-cyan-950/50 border border-cyan-200/50 dark:border-cyan-900/40",
  },
  SUPERVISOR_ASSIGNED: {
    icon: Users,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-950/50 border border-violet-200/50 dark:border-violet-900/40",
  },
  NEW_MESSAGE: {
    icon: Mail,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-900/40",
  },
};

function formatTimeAgo(dateStr: string, locale: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    if (days >= 1) return rtf.format(-days, "day");
    if (hours >= 1) return rtf.format(-hours, "hour");
    if (mins >= 1) return rtf.format(-mins, "minute");
    return locale === "ar" ? "الآن" : "Just now";
  } catch {
    if (days >= 1) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    if (mins >= 1) return `${mins}m ago`;
    return "Just now";
  }
}

export default function NotificationBell() {
  const t = useTranslations("navbar.notifications");
  const notifTypeT = useTranslations("notificationTypes");
  const locale = useLocale();
  const isRtl = locale === "ar";
  const [open, setOpen] = useState(false);
  const [notifications, setNotifs] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // ─── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifs(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
    } finally {
      setLoading(false);
    }
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
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
    setNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
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

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ─── Bell Button ─── */}
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
          className="fixed inset-x-2 top-16 z-50 overflow-hidden rounded-2xl border border-outline/80 bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-[390px] animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-outline/70 px-4 py-3 bg-surface">
            <div className="flex min-w-0 items-center gap-2">
              <Bell className="h-4 w-4 shrink-0 text-brandPurple-600 dark:text-brandPurple-400" />
              <Link
                href="/list/notifications"
                onClick={() => closeDropdown(false)}
                className="truncate text-sm font-bold text-content-primary transition-colors hover:text-brandPurple-600"
              >
                {t("label")}
              </Link>
              {unreadCount > 0 && (
                <span className="rounded-full bg-brandPurple-100 dark:bg-brandPurple-950/60 border border-brandPurple-200/50 dark:border-brandPurple-800/50 px-2 py-0.5 text-[11px] font-bold text-brandPurple-700 dark:text-brandPurple-300">
                  {t("newCount", { count: unreadCount })}
                </span>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-content-muted transition-colors hover:text-brandPurple-600 hover:bg-surface-muted px-2 py-1 rounded-lg"
                  title={t("markAllRead")}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden min-[380px]:inline">
                    {t("allRead")}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => closeDropdown(true)}
                className="p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition"
                aria-label={t("close")}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[min(24rem,calc(100vh-11rem))] overflow-y-auto academix-menu-scroll">
            {loading && notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-brandPurple-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-2">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center mx-auto text-content-muted">
                  <Bell className="w-5 h-5 text-content-muted" />
                </div>
                <p className="text-sm font-semibold text-content-secondary">
                  {t("empty")}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-outline/60">
                {notifications.map((n) => {
                  const {
                    icon: Icon,
                    color,
                    bg,
                  } = TYPE_ICON[n.type] ?? TYPE_ICON.NEW_MESSAGE;
                  const content = (
                    <div
                      className={`flex cursor-pointer items-start gap-3 px-4 py-3.5 transition-colors ${
                        n.isRead
                          ? "bg-surface hover:bg-surface-muted/60"
                          : "bg-brandPurple-50/40 hover:bg-brandPurple-50/70 dark:bg-brandPurple-950/20 dark:hover:bg-brandPurple-950/40"
                      }`}
                      onClick={() => !n.isRead && markRead(n.id)}
                    >
                      <div
                        className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs ${bg}`}
                      >
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm tracking-tight ${
                            n.isRead
                              ? "font-medium text-content-secondary"
                              : "font-bold text-content-primary"
                          }`}
                        >
                          {notifTypeT.has(n.type as any) ? notifTypeT(n.type as any) : n.title}
                        </p>
                        <p className="text-xs text-content-muted mt-0.5 line-clamp-2 leading-relaxed">
                          {localizeNotificationBody(n.body, locale)}
                        </p>
                        <p className="text-[11px] text-content-muted mt-1 font-medium">
                          {formatTimeAgo(n.createdAt, locale)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-brandPurple-600 ring-2 ring-brandPurple-200 dark:ring-brandPurple-800 mt-1.5" />
                      )}
                    </div>
                  );

                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link
                          href={n.link}
                          onClick={() => {
                            markRead(n.id);
                            closeDropdown(false);
                          }}
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-outline/70 flex items-center justify-between bg-surface-muted/30">
            <Link
              href="/list/notifications"
              onClick={() => closeDropdown(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brandPurple-600 hover:text-brandPurple-700 dark:text-brandPurple-400 transition-colors"
            >
              <span>{t("viewAll")}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => closeDropdown(true)}
              className="text-xs font-medium text-content-muted hover:text-content-primary transition-colors px-2 py-1 rounded-lg hover:bg-surface-muted"
            >
              {t("close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
