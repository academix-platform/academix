"use client";

import React, {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
  Award,
  Calendar,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  LayoutGrid,
  Loader2,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { saveDailyAttendance, saveWeeklyAttendance } from "@/lib/actions";
import {
  WeeklyAttendanceDataResult,
  WeeklyDayInfo,
  WeeklyRosterItem,
} from "@/lib/attendance";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Select } from "@/components/ui/select";
import Pagination from "@/components/Pagination";
import { cn } from "@/lib/utils";

export type AttendanceRosterItem = {
  id: string;
  name: string;
  username?: string | null;
  img?: string | null;
  className: string;
  present: boolean;
  isRecorded?: boolean;
};

export type AttendanceItemStatus = "present" | "absent" | "unrecorded";

type AttendanceClientProps = {
  data: AttendanceRosterItem[];
  weeklyData?: WeeklyAttendanceDataResult;
  initialView?: "daily" | "weekly";
  selectedDate: string;
  isToday: boolean;
  hasAttendance: boolean;
  scope: "students" | "teachers";
  canEdit: boolean;
  academicYear: {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
  };
  classes?: { id: number; name: string }[];
  effectiveClassId?: number;
  grades?: { id: number; level: number }[];
  selectedGradeId?: number;
  role: string;
};

export default function AttendanceClient({
  data,
  weeklyData,
  initialView = "daily",
  selectedDate,
  isToday,
  hasAttendance,
  scope,
  canEdit,
  academicYear,
  classes = [],
  effectiveClassId,
  grades = [],
  selectedGradeId,
  role,
}: AttendanceClientProps) {
  const t = useTranslations("attendance");
  const filtersT = useTranslations("filters");
  const actionsT = useTranslations("actions");
  const th = useTranslations("tableHeaders");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isNavigating, startTransition] = useTransition();

  // Active view: "daily" vs "weekly"
  const viewParam = searchParams.get("view");
  const activeView: "daily" | "weekly" =
    viewParam === "weekly" || (!viewParam && initialView === "weekly")
      ? "weekly"
      : "daily";

  // Local unsaved changes map for Daily View: { [id]: boolean }
  const [changes, setChanges] = useState<Record<string, boolean>>({});

  // Local unsaved changes map for Weekly View: { [`${id}:${date}`]: boolean }
  const [weeklyChanges, setWeeklyChanges] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState("");
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };
  const [isConfirmAbsentOpen, setIsConfirmAbsentOpen] = useState(false);
  const handledDailyResultRef = useRef<string | null>(null);
  const handledWeeklyResultRef = useRef<string | null>(null);

  // Form action for saving Daily attendance
  const [dailyState, dailyFormAction, isDailyPending] = useActionState(
    saveDailyAttendance,
    {
      success: false,
      error: false,
      message: "",
    },
  );

  // Form action for saving Weekly attendance
  const [weeklyState, weeklyFormAction, isWeeklyPending] = useActionState(
    saveWeeklyAttendance,
    {
      success: false,
      error: false,
      message: "",
    },
  );

  const isSaving = isDailyPending || isWeeklyPending;

  // ---------------------------------------------------------------------------
  // DAILY VIEW: Pending & Diff calculations
  // ---------------------------------------------------------------------------
  const dailyPendingCount = useMemo(() => {
    let count = 0;
    for (const item of data) {
      if (item.id in changes) {
        if (!item.isRecorded) {
          count++;
        } else if (changes[item.id] !== item.present) {
          count++;
        }
      }
    }
    return count;
  }, [data, changes]);

  const dailyDiffChanges = useMemo(() => {
    const diff: Record<string, boolean> = {};
    for (const item of data) {
      if (item.id in changes) {
        if (!item.isRecorded || changes[item.id] !== item.present) {
          diff[item.id] = changes[item.id];
        }
      }
    }
    return diff;
  }, [data, changes]);

  // ---------------------------------------------------------------------------
  // WEEKLY VIEW: Pending & Diff calculations
  // ---------------------------------------------------------------------------
  const weeklyDiffList = useMemo(() => {
    if (!weeklyData || !weeklyData.data) return [];
    const list: Array<{ id: string; date: string; present: boolean }> = [];
    for (const [key, newPresent] of Object.entries(weeklyChanges)) {
      const [id, dateStr] = key.split(":");
      const student = weeklyData.data.find((s) => s.id === id);
      const original = student?.attendanceByDate?.[dateStr];
      if (!original?.isRecorded || original.present !== newPresent) {
        list.push({ id, date: dateStr, present: newPresent });
      }
    }
    return list;
  }, [weeklyData, weeklyChanges]);

  const weeklyPendingCount = weeklyDiffList.length;

  // Active pending count depends on current view
  const activePendingCount =
    activeView === "weekly" ? weeklyPendingCount : dailyPendingCount;

  // ---------------------------------------------------------------------------
  // Handle Server Action Responses
  // ---------------------------------------------------------------------------
  // Daily Save response
  useEffect(() => {
    if (isDailyPending) {
      handledDailyResultRef.current = null;
      return;
    }
    const resultKey = `${dailyState.success}:${dailyState.error}:${dailyState.message}`;
    if (handledDailyResultRef.current === resultKey) return;
    handledDailyResultRef.current = resultKey;

    if (dailyState.success) {
      toast.success(dailyState.message || t("saved"));
      React.startTransition(() => {
        setChanges({});
      });
      router.refresh();
    } else if (dailyState.error) {
      toast.error(
        dailyState.message || t("saveError") || actionsT("somethingWentWrong"),
      );
    }
  }, [dailyState, isDailyPending, router, t, actionsT]);

  // Weekly Save response
  useEffect(() => {
    if (isWeeklyPending) {
      handledWeeklyResultRef.current = null;
      return;
    }
    const resultKey = `${weeklyState.success}:${weeklyState.error}:${weeklyState.message}`;
    if (handledWeeklyResultRef.current === resultKey) return;
    handledWeeklyResultRef.current = resultKey;

    if (weeklyState.success) {
      toast.success(weeklyState.message || t("saved"));
      React.startTransition(() => {
        setWeeklyChanges({});
      });
      router.refresh();
    } else if (weeklyState.error) {
      toast.error(
        weeklyState.message || t("saveError") || actionsT("somethingWentWrong"),
      );
    }
  }, [weeklyState, isWeeklyPending, router, t, actionsT]);

  // Browser navigation warning when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activePendingCount > 0) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activePendingCount]);

  // Helper to safely navigate with unsaved change check
  const navigateWithGuard = (nextUrl: string) => {
    if (activePendingCount > 0) {
      toast.warn(
        ({ closeToast }) => (
          <div className="space-y-2 py-0.5">
            <p className="text-xs font-semibold leading-relaxed">
              {t("unsavedWarning")}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  closeToast();
                  setChanges({});
                  setWeeklyChanges({});
                  startTransition(() => {
                    router.push(nextUrl);
                  });
                }}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                {t("discardAndLeave")}
              </button>
              <button
                type="button"
                onClick={closeToast}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ),
        {
          toastId: "unsaved-attendance-warning",
          autoClose: 8000,
        },
      );
      return;
    }
    setChanges({});
    setWeeklyChanges({});
    startTransition(() => {
      router.push(nextUrl);
    });
  };

  // View mode switcher handler
  const handleViewChange = (newView: "daily" | "weekly") => {
    if (newView === activeView) return;
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (newView === "weekly") {
      params.set("view", "weekly");
    } else {
      params.delete("view");
    }
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  // Date switching handlers
  const handleDateChange = (newDate: string) => {
    if (!newDate || newDate === selectedDate) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", newDate);
    params.set("page", "1");
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  const handleShortcutToday = () => {
    const today = new Date().toISOString().slice(0, 10);
    handleDateChange(today);
  };

  const handleShortcutYesterday = () => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().slice(0, 10);
    handleDateChange(yesterday);
  };

  // Week navigation handlers (steps -7 / +7 days)
  const handleWeekOffset = (days: number) => {
    const [y, m, d] = selectedDate.split("-").map(Number);
    const cur = new Date(Date.UTC(y, m - 1, d));
    cur.setUTCDate(cur.getUTCDate() + days);
    const newDate = cur.toISOString().slice(0, 10);
    handleDateChange(newDate);
  };

  // Scope switching (Admin)
  const handleScopeChange = (newScope: "students" | "teachers") => {
    if (newScope === scope) return;
    const params = new URLSearchParams();
    params.set("scope", newScope);
    params.set("date", selectedDate);
    if (activeView === "weekly") {
      params.set("view", "weekly");
    }
    if (newScope === "students" && effectiveClassId) {
      params.set("classId", String(effectiveClassId));
    }
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  // Grade filter (Admin)
  const handleGradeChange = (gradeVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gradeVal && gradeVal !== "all") {
      params.set("gradeId", gradeVal);
    } else {
      params.delete("gradeId");
    }
    params.delete("classId");
    params.set("page", "1");
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  // Class select (Admin)
  const handleClassSelect = (classVal: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (classVal) {
      params.set("classId", classVal);
    } else {
      params.delete("classId");
    }
    params.set("page", "1");
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  // Class tab select (Teacher)
  const handleTeacherClassTab = (clsId: number) => {
    if (clsId === effectiveClassId) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("classId", String(clsId));
    params.set("page", "1");
    navigateWithGuard(`/list/attendance?${params.toString()}`);
  };

  // ---------------------------------------------------------------------------
  // DAILY VIEW: Item status & Toggle
  // ---------------------------------------------------------------------------
  const getItemStatus = useCallback(
    (item: AttendanceRosterItem): AttendanceItemStatus => {
      if (item.id in changes) {
        return changes[item.id] ? "present" : "absent";
      }
      if (!item.isRecorded) {
        return "unrecorded";
      }
      return item.present ? "present" : "absent";
    },
    [changes],
  );

  const handleToggleStatus = (id: string, newStatus: boolean) => {
    if (!canEdit) return;
    setChanges((prev) => ({
      ...prev,
      [id]: newStatus,
    }));
  };

  // ---------------------------------------------------------------------------
  // WEEKLY VIEW: Status, Checkbox Toggle & Helper
  // ---------------------------------------------------------------------------
  const getWeeklyStatus = useCallback(
    (studentId: string, dateStr: string): boolean => {
      const key = `${studentId}:${dateStr}`;
      if (key in weeklyChanges) {
        return weeklyChanges[key];
      }
      const student = weeklyData?.data.find((s) => s.id === studentId);
      return student?.attendanceByDate?.[dateStr]?.present ?? false;
    },
    [weeklyChanges, weeklyData],
  );

  const isWeeklyModified = useCallback(
    (studentId: string, dateStr: string): boolean => {
      const key = `${studentId}:${dateStr}`;
      if (!(key in weeklyChanges)) return false;
      const student = weeklyData?.data.find((s) => s.id === studentId);
      const original = student?.attendanceByDate?.[dateStr];
      return !original?.isRecorded || original.present !== weeklyChanges[key];
    },
    [weeklyChanges, weeklyData],
  );

  const handleToggleWeeklyCheckbox = (studentId: string, dateStr: string) => {
    if (!canEdit) return;
    const current = getWeeklyStatus(studentId, dateStr);
    const key = `${studentId}:${dateStr}`;
    setWeeklyChanges((prev) => ({
      ...prev,
      [key]: !current,
    }));
  };

  // ---------------------------------------------------------------------------
  // BATCH ACTIONS
  // ---------------------------------------------------------------------------
  const handleMarkAllPresent = () => {
    if (!canEdit) return;
    if (activeView === "weekly") {
      if (!weeklyData || weeklyData.data.length === 0) return;
      const next = { ...weeklyChanges };
      weeklyData.data.forEach((student) => {
        weeklyData.weekDays.forEach((day) => {
          next[`${student.id}:${day.date}`] = true;
        });
      });
      setWeeklyChanges(next);
    } else {
      if (data.length === 0) return;
      const next: Record<string, boolean> = { ...changes };
      data.forEach((item) => {
        next[item.id] = true;
      });
      setChanges(next);
    }
  };

  const handleConfirmMarkAllAbsent = () => {
    if (!canEdit) return;
    if (activeView === "weekly") {
      if (!weeklyData || weeklyData.data.length === 0) return;
      const next = { ...weeklyChanges };
      weeklyData.data.forEach((student) => {
        weeklyData.weekDays.forEach((day) => {
          next[`${student.id}:${day.date}`] = false;
        });
      });
      setWeeklyChanges(next);
    } else {
      if (data.length === 0) return;
      const next: Record<string, boolean> = { ...changes };
      data.forEach((item) => {
        next[item.id] = false;
      });
      setChanges(next);
    }
    setIsConfirmAbsentOpen(false);
  };

  // Reset changes to baseline
  const handleReset = () => {
    if (activeView === "weekly") {
      setWeeklyChanges({});
    } else {
      setChanges({});
    }
  };

  // ---------------------------------------------------------------------------
  // LIVE METRICS: Daily & Weekly
  // ---------------------------------------------------------------------------
  const totalCount = activeView === "weekly" ? (weeklyData?.data.length ?? 0) : data.length;

  // Daily Metrics
  const presentCount = useMemo(() => {
    return data.filter((item) => getItemStatus(item) === "present").length;
  }, [data, getItemStatus]);

  const absentCount = useMemo(() => {
    return data.filter((item) => getItemStatus(item) === "absent").length;
  }, [data, getItemStatus]);

  const unrecordedCount = useMemo(() => {
    return data.filter((item) => getItemStatus(item) === "unrecorded").length;
  }, [data, getItemStatus]);

  const totalRecorded = presentCount + absentCount;

  const attendanceRate = useMemo(() => {
    if (totalCount === 0 || totalRecorded === 0) return 0;
    const rate = (presentCount / totalCount) * 100;
    return Math.round(rate * 10) / 10;
  }, [presentCount, totalCount, totalRecorded]);

  const absentRate = useMemo(() => {
    if (totalCount === 0 || totalRecorded === 0) return 0;
    const rate = (absentCount / totalCount) * 100;
    return Math.round(rate * 10) / 10;
  }, [absentCount, totalCount, totalRecorded]);

  // Weekly Metrics
  const weeklyTotalDays = weeklyData?.weekDays.length ?? 0;
  const weeklyTotalPossibleSlots = totalCount * weeklyTotalDays;

  const weeklyPresentSlots = useMemo(() => {
    if (!weeklyData || !weeklyData.data) return 0;
    let count = 0;
    weeklyData.data.forEach((student) => {
      weeklyData.weekDays.forEach((day) => {
        if (getWeeklyStatus(student.id, day.date)) {
          count++;
        }
      });
    });
    return count;
  }, [weeklyData, getWeeklyStatus]);

  const weeklyAttendanceRate = useMemo(() => {
    if (weeklyTotalPossibleSlots === 0) return 0;
    const rate = (weeklyPresentSlots / weeklyTotalPossibleSlots) * 100;
    return Math.round(rate * 10) / 10;
  }, [weeklyPresentSlots, weeklyTotalPossibleSlots]);

  // Count how many days in the week have attendance recorded
  const weeklyRecordedDaysCount = useMemo(() => {
    if (!weeklyData || !weeklyData.weekDays || !weeklyData.data) return 0;
    let count = 0;
    weeklyData.weekDays.forEach((day) => {
      const isDayRecorded = weeklyData.data.some((student) => {
        const key = `${student.id}:${day.date}`;
        if (key in weeklyChanges) return true;
        return student.attendanceByDate?.[day.date]?.isRecorded === true;
      });
      if (isDayRecorded) count++;
    });
    return count;
  }, [weeklyData, weeklyChanges]);

  // Client-side search filters
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchUser = item.username?.toLowerCase().includes(q);
      return matchName || matchUser;
    });
  }, [data, searchQuery]);

  const filteredWeeklyData = useMemo(() => {
    if (!weeklyData || !weeklyData.data) return [];
    if (!searchQuery.trim()) return weeklyData.data;
    const q = searchQuery.toLowerCase().trim();
    return weeklyData.data.filter((item) => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchUser = item.username?.toLowerCase().includes(q);
      return matchName || matchUser;
    });
  }, [weeklyData, searchQuery]);

  // Client-Side Pagination (preserves all dirty form changes across page navigation)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const currentTotalCount =
    activeView === "weekly" ? filteredWeeklyData.length : filteredData.length;
  const totalPages = Math.max(1, Math.ceil(currentTotalCount / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDailyData = useMemo(() => {
    const from = (safePage - 1) * pageSize;
    return filteredData.slice(from, from + pageSize);
  }, [filteredData, safePage, pageSize]);

  const paginatedWeeklyData = useMemo(() => {
    const from = (safePage - 1) * pageSize;
    return filteredWeeklyData.slice(from, from + pageSize);
  }, [filteredWeeklyData, safePage, pageSize]);

  // Format localized display dates
  const formattedDisplayDate = useMemo(() => {
    try {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const d = new Date(
          Number.parseInt(parts[0], 10),
          Number.parseInt(parts[1], 10) - 1,
          Number.parseInt(parts[2], 10),
        );
        return d.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
    } catch {
      // fallback
    }
    return selectedDate;
  }, [selectedDate, locale]);

  // Localized month helper for day columns
  const getLocalizedDayMonth = useCallback(
    (dateStr: string) => {
      try {
        const [year, month, dayNum] = dateStr.split("-").map(Number);
        const d = new Date(Date.UTC(year, month - 1, dayNum));
        return d.toLocaleDateString(
          locale === "ar" ? "ar-u-nu-latn" : "en-US",
          { month: "short", timeZone: "UTC" },
        );
      } catch {
        return "";
      }
    },
    [locale],
  );

  const formattedWeekRange = useMemo(() => {
    if (!weeklyData || weeklyData.weekDays.length === 0) return "";
    const first = weeklyData.weekDays[0];
    const last = weeklyData.weekDays[weeklyData.weekDays.length - 1];

    try {
      const [y1, m1, d1] = first.date.split("-").map(Number);
      const [y2, m2, d2] = last.date.split("-").map(Number);
      const date1 = new Date(Date.UTC(y1, m1 - 1, d1));
      const date2 = new Date(Date.UTC(y2, m2 - 1, d2));

      if (locale === "ar") {
        const month1 = date1.toLocaleDateString("ar-u-nu-latn", {
          month: "short",
          timeZone: "UTC",
        });
        const month2 = date2.toLocaleDateString("ar-u-nu-latn", {
          month: "short",
          timeZone: "UTC",
        });

        if (month1 === month2) {
          return `${first.dayNumber} إلى ${last.dayNumber} ${month1}`;
        }
        return `${first.dayNumber} ${month1} إلى ${last.dayNumber} ${month2}`;
      }

      // English
      return `${first.dayNumber} ${first.monthShort} — ${last.dayNumber} ${last.monthShort}`;
    } catch {
      return `${first.dayNumber} — ${last.dayNumber}`;
    }
  }, [weeklyData, locale]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* ========================================================================= */}
      {/* 1. MAIN WORKSPACE: Metric Cards + Roster + Save Action                   */}
      {/* ========================================================================= */}
      <div className="flex-1 min-w-0 space-y-6 w-full order-2 lg:order-1">
        {/* ATTENDANCE SUMMARY CARDS (Live Responsive Metric Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 min-[1400px]:grid-cols-4 gap-3 md:gap-4">
          {/* Card 1: Total Students / Teachers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 lg:p-4 xl:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {scope === "students" ? t("totalStudents") : t("totalTeachers")}
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {scope === "students" && effectiveClassId
                ? classes.find((c) => c.id === effectiveClassId)?.name || t("class")
                : t("teacherRoster")}
            </p>
          </div>

          {/* Card 2: Daily Present / Weekly Working Days */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 lg:p-4 xl:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {activeView === "weekly" ? t("workingDays") : t("presentCount")}
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                {activeView === "weekly" ? (
                  <CalendarDays className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {activeView === "weekly" ? weeklyTotalDays : presentCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeView === "weekly" ? (
                <bdi>{formattedWeekRange}</bdi>
              ) : totalRecorded > 0 ? (
                `${attendanceRate}% ${t("present")}`
              ) : (
                t("unrecorded")
              )}
            </p>
          </div>

          {/* Card 3: Daily Absent / Weekly Recorded Days */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 lg:p-4 xl:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {activeView === "weekly" ? t("recordedDays") : t("absentCount")}
              </span>
              <div
                className={cn(
                  "p-1.5 sm:p-2 rounded-xl shrink-0",
                  activeView === "weekly"
                    ? "bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400",
                )}
              >
                {activeView === "weekly" ? (
                  <CheckCheck className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "text-2xl md:text-3xl font-bold tracking-tight",
                activeView === "weekly"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {activeView === "weekly" ? weeklyRecordedDaysCount : absentCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {activeView === "weekly" ? (
                <span className="inline-flex items-center gap-1">
                  <bdi dir="ltr">
                    {weeklyRecordedDaysCount} / {weeklyTotalDays}
                  </bdi>
                  <span>{t("daysRecorded")}</span>
                </span>
              ) : totalRecorded > 0 ? (
                `${absentRate}% ${t("absent")}`
              ) : (
                t("unrecorded")
              )}
            </p>
          </div>

          {/* Card 4: Attendance Rate (Daily or Weekly) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 lg:p-4 xl:p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                {activeView === "weekly" ? t("weeklyRate") : t("attendanceRate")}
              </span>
              <div className="p-1.5 sm:p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {activeView === "weekly"
                ? `${weeklyAttendanceRate}%`
                : totalRecorded > 0
                ? `${attendanceRate}%`
                : "—"}
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Badge
                variant={
                  activeView === "weekly"
                    ? weeklyAttendanceRate >= 75
                      ? "success"
                      : "warning"
                    : unrecordedCount === 0 && totalRecorded > 0
                    ? "success"
                    : "warning"
                }
                size="sm"
                dot
              >
                {activeView === "weekly"
                  ? `${t("weeklySummary")}`
                  : unrecordedCount === 0 && totalRecorded > 0
                  ? t("recorded")
                  : totalRecorded > 0
                  ? t("partiallyRecorded")
                  : t("unrecorded")}
              </Badge>
              <span className="font-medium text-slate-500 dark:text-slate-400 shrink-0">
                {activeView === "weekly"
                  ? `${weeklyPresentSlots}/${weeklyTotalPossibleSlots}`
                  : totalRecorded > 0
                  ? `${presentCount}/${totalCount}`
                  : ""}
              </span>
            </div>
            {/* Live Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      activeView === "weekly"
                        ? weeklyAttendanceRate
                        : attendanceRate,
                    ),
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* ROSTER CARD: View Switcher, Search, Batch & Roster (Daily or Weekly) */}
        {/* ===================================================================== */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Header Toolbar: View Switcher + Search + Batch Controls */}
          <div className="p-4 md:p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Area: View Switcher (Daily vs Weekly) */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div
                role="tablist"
                aria-label={t("viewMode")}
                className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === "daily"}
                  onClick={() => handleViewChange("daily")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    activeView === "daily"
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("dailyView")}</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={activeView === "weekly"}
                  onClick={() => handleViewChange("weekly")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    activeView === "weekly"
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t("weeklyView")}</span>
                </button>
              </div>
            </div>

            {/* Right Area: Search + Batch Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 justify-end">
              {/* Client Search Filter */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={
                    scope === "students"
                      ? t("searchStudentsPlaceholder")
                      : t("searchTeachersPlaceholder")
                  }
                  className="w-full h-9 ps-9 pe-4 py-1.5 text-xs md:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Batch Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Mark All Present */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || totalCount === 0}
                  onClick={handleMarkAllPresent}
                  className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                  leftIcon={
                    <CheckCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  }
                >
                  {t("markAllPresent")}
                </Button>

                {/* Mark All Absent */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canEdit || totalCount === 0}
                  onClick={() => setIsConfirmAbsentOpen(true)}
                  className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-semibold"
                  leftIcon={
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  }
                >
                  {t("markAllAbsent")}
                </Button>
              </div>
            </div>
          </div>

          {/* Confirmation Dialog for Mark All Absent */}
          <ConfirmDialog
            open={isConfirmAbsentOpen}
            onOpenChange={setIsConfirmAbsentOpen}
            title={
              scope === "students"
                ? t("confirmMarkAllAbsentTitle")
                : t("confirmMarkAllAbsentTeachersTitle")
            }
            description={
              scope === "students"
                ? t("confirmMarkAllAbsentDesc")
                : t("confirmMarkAllAbsentTeachersDesc")
            }
            confirmLabel={t("confirm")}
            cancelLabel={t("cancel")}
            variant="destructive"
            onConfirm={handleConfirmMarkAllAbsent}
          />

          {/* =================================================================== */}
          {/* VIEW 1: WEEKLY ATTENDANCE VIEW (with simple check boxes per day)    */}
          {/* =================================================================== */}
          {activeView === "weekly" ? (
            filteredWeeklyData.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {searchQuery.trim()
                    ? scope === "students"
                      ? t("noStudentsFound")
                      : t("noTeachersFound")
                    : t("noRecordsDate")}
                </p>
                {searchQuery.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange("")}
                    className="mt-3 text-xs text-purple-600 dark:text-purple-400 font-medium"
                  >
                    Clear search query
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* WEEKLY DESKTOP & TABLET TABLE */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs md:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-start text-[11px] font-semibold uppercase tracking-wider">
                        {/* Sticky Student Name Column */}
                        <th className="py-3 px-4 text-start font-semibold sticky start-0 bg-slate-50/90 dark:bg-slate-800/90 backdrop-blur-xs z-10 min-w-[200px]">
                          {scope === "students" ? t("student") : t("teacher")}
                        </th>

                        {/* Class Column */}
                        {scope === "students" && (
                          <th className="py-3 px-3 text-start font-semibold min-w-[80px]">
                            {t("class")}
                          </th>
                        )}

                        {/* Working Day Columns */}
                        {weeklyData?.weekDays.map((day) => {
                          const localizedDay =
                            locale === "ar"
                              ? t(`day${day.dayShort}` as any) || day.dayShort
                              : day.dayShort;

                          return (
                            <th
                              key={day.date}
                              className={cn(
                                "py-3 px-3 text-center font-semibold border-s border-slate-200/60 dark:border-slate-800/60 min-w-[76px]",
                                day.isToday &&
                                  "bg-purple-50/70 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200",
                              )}
                            >
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                  {localizedDay}
                                </span>
                                <span
                                  className={cn(
                                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                                    day.isToday
                                      ? "bg-purple-600 text-white font-bold"
                                      : "text-slate-500 dark:text-slate-400",
                                  )}
                                >
                                  {day.dayNumber} {getLocalizedDayMonth(day.date)}
                                </span>
                              </div>
                            </th>
                          );
                        })}

                        {/* Weekly Summary Column */}
                        <th className="py-3 px-4 text-center font-semibold border-s border-slate-200/60 dark:border-slate-800/60 min-w-[90px]">
                          {t("weeklySummary")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedWeeklyData.map((item) => {
                        // Calculate student's live present count for this week
                        let studentPresentDays = 0;
                        weeklyData?.weekDays.forEach((day) => {
                          if (getWeeklyStatus(item.id, day.date)) {
                            studentPresentDays++;
                          }
                        });
                        const totalDays = weeklyData?.weekDays.length ?? 0;

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Sticky Student Column */}
                            <td className="py-3 px-4 sticky start-0 bg-white dark:bg-slate-900 z-10 shadow-xs">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={item.img}
                                  name={item.name}
                                  size="md"
                                  className="ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {item.name}
                                  </span>
                                  {item.username && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      @{item.username}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Class Column */}
                            {scope === "students" && (
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200/60 dark:border-purple-800/60">
                                  {item.className}
                                </span>
                              </td>
                            )}

                            {/* Checkbox for each day */}
                            {weeklyData?.weekDays.map((day) => {
                              const isChecked = getWeeklyStatus(item.id, day.date);
                              const isModified = isWeeklyModified(item.id, day.date);

                              return (
                                <td
                                  key={day.date}
                                  className={cn(
                                    "py-3 px-2 text-center border-s border-slate-100 dark:border-slate-800/60",
                                    day.isToday &&
                                      "bg-purple-50/25 dark:bg-purple-950/15",
                                  )}
                                >
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isChecked}
                                    disabled={!canEdit}
                                    onClick={() =>
                                      handleToggleWeeklyCheckbox(item.id, day.date)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === " " || e.key === "Enter") {
                                        e.preventDefault();
                                        handleToggleWeeklyCheckbox(
                                          item.id,
                                          day.date,
                                        );
                                      }
                                    }}
                                    aria-label={`${item.name} - ${day.dayShort} ${day.dayNumber}: ${
                                      isChecked ? t("present") : t("absent")
                                    }`}
                                    className={cn(
                                      "relative mx-auto flex items-center justify-center w-6 h-6 rounded-md border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
                                      isChecked
                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs hover:bg-emerald-700"
                                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30",
                                      isModified &&
                                        "ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-slate-900",
                                    )}
                                  >
                                    {isChecked && (
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            {/* Weekly Student Rate Badge */}
                            <td className="py-3 px-4 text-center border-s border-slate-200/60 dark:border-slate-800/60">
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                                  studentPresentDays === totalDays && totalDays > 0
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                    : studentPresentDays > 0
                                    ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
                                )}
                              >
                                {studentPresentDays}/{totalDays}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* WEEKLY MOBILE STACKED CARDS (<640px) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedWeeklyData.map((item) => {
                    let studentPresentDays = 0;
                    weeklyData?.weekDays.forEach((day) => {
                      if (getWeeklyStatus(item.id, day.date)) {
                        studentPresentDays++;
                      }
                    });
                    const totalDays = weeklyData?.weekDays.length ?? 0;

                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={item.img}
                              name={item.name}
                              size="md"
                              className="ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </span>
                              {item.username && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  @{item.username}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {scope === "students" && (
                              <Badge variant="secondary" size="sm">
                                {item.className}
                              </Badge>
                            )}
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                                studentPresentDays === totalDays && totalDays > 0
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : studentPresentDays > 0
                                  ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800"
                                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800",
                              )}
                            >
                              {studentPresentDays}/{totalDays}
                            </span>
                          </div>
                        </div>

                        {/* Mobile Checkbox Row */}
                        <div className="grid grid-cols-6 gap-1.5 pt-1">
                          {weeklyData?.weekDays.map((day) => {
                            const isChecked = getWeeklyStatus(item.id, day.date);
                            const isModified = isWeeklyModified(item.id, day.date);
                            const localizedDay =
                              locale === "ar"
                                ? t(`day${day.dayShort}` as any) || day.dayShort
                                : day.dayShort;

                            return (
                              <div
                                key={day.date}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-2 rounded-xl border text-center transition-all",
                                  day.isToday
                                    ? "bg-purple-50/50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                                    : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800",
                                )}
                              >
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                                  {localizedDay}
                                </span>
                                <button
                                  type="button"
                                  role="checkbox"
                                  aria-checked={isChecked}
                                  disabled={!canEdit}
                                  onClick={() =>
                                    handleToggleWeeklyCheckbox(item.id, day.date)
                                  }
                                  className={cn(
                                    "flex items-center justify-center w-7 h-7 rounded-md border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
                                    isChecked
                                      ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-emerald-500",
                                    isModified &&
                                      "ring-2 ring-amber-400 ring-offset-1",
                                  )}
                                >
                                  {isChecked && (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  )}
                                </button>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {day.dayNumber}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            /* =================================================================== */
            /* VIEW 2: DAILY ATTENDANCE VIEW (Existing Roster with Status Buttons) */
            /* =================================================================== */
            filteredData.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {searchQuery.trim()
                    ? scope === "students"
                      ? t("noStudentsFound")
                      : t("noTeachersFound")
                    : t("noRecordsDate")}
                </p>
                {searchQuery.trim() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSearchChange("")}
                    className="mt-3 text-xs text-purple-600 dark:text-purple-400 font-medium"
                  >
                    Clear search query
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* DESKTOP TABLE */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/70 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-start text-[11px] font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4 text-start font-semibold">
                          {scope === "students" ? t("student") : t("teacher")}
                        </th>
                        {scope === "students" && (
                          <th className="py-3 px-4 text-start font-semibold">
                            {t("class")}
                          </th>
                        )}
                        <th className="py-3 px-4 text-end font-semibold">
                          {t("status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {paginatedDailyData.map((item) => {
                        const status = getItemStatus(item);
                        const isPresent = status === "present";
                        const isAbsent = status === "absent";
                        const isUnrecorded = status === "unrecorded";

                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Student / Teacher Name & Username */}
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={item.img}
                                  name={item.name}
                                  size="md"
                                  className="ring-1 ring-slate-200 dark:ring-slate-700"
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                    {item.name}
                                  </span>
                                  {item.username && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      @{item.username}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Class */}
                            {scope === "students" && (
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-medium">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200/60 dark:border-purple-800/60">
                                  {item.className}
                                </span>
                              </td>
                            )}

                            {/* Status Controls */}
                            <td className="py-3 px-4 text-end">
                              <div className="inline-flex items-center gap-2.5 justify-end">
                                {isUnrecorded && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                    {t("notRecorded")}
                                  </span>
                                )}
                                <div
                                  role="radiogroup"
                                  aria-label={`${item.name} - ${
                                    isPresent
                                      ? t("present")
                                      : isAbsent
                                      ? t("absent")
                                      : t("notRecorded")
                                  }`}
                                  className="inline-flex items-center gap-1.5"
                                >
                                  {/* Present Button */}
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isPresent}
                                    disabled={!canEdit}
                                    onClick={() =>
                                      handleToggleStatus(item.id, true)
                                    }
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                                      isPresent
                                        ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs font-bold"
                                        : isUnrecorded
                                        ? "bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-xs"
                                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/60",
                                    )}
                                  >
                                    <Check
                                      className={cn(
                                        "w-3.5 h-3.5 shrink-0",
                                        isPresent
                                          ? "stroke-[2.5]"
                                          : isUnrecorded
                                          ? "stroke-[2.5] text-emerald-600 dark:text-emerald-400"
                                          : "stroke-2",
                                      )}
                                    />
                                    <span>{t("present")}</span>
                                  </button>

                                  {/* Absent Button */}
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={isAbsent}
                                    disabled={!canEdit}
                                    onClick={() =>
                                      handleToggleStatus(item.id, false)
                                    }
                                    className={cn(
                                      "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                                      isAbsent
                                        ? "bg-rose-600 text-white border border-rose-600 shadow-xs font-bold"
                                        : isUnrecorded
                                        ? "bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-xs"
                                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/60",
                                    )}
                                  >
                                    <X
                                      className={cn(
                                        "w-3.5 h-3.5 shrink-0",
                                        isAbsent
                                          ? "stroke-[2.5]"
                                          : isUnrecorded
                                          ? "stroke-[2.5] text-rose-600 dark:text-rose-400"
                                          : "stroke-2",
                                      )}
                                    />
                                    <span>{t("absent")}</span>
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE STACKED LIST (<640px) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedDailyData.map((item) => {
                    const status = getItemStatus(item);
                    const isPresent = status === "present";
                    const isAbsent = status === "absent";
                    const isUnrecorded = status === "unrecorded";

                    return (
                      <div key={item.id} className="p-4 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              src={item.img}
                              name={item.name}
                              size="md"
                              className="ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                                {item.name}
                              </span>
                              {item.username && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                  @{item.username}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isUnrecorded && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                {t("notRecorded")}
                              </span>
                            )}
                            {scope === "students" && (
                              <Badge variant="secondary" size="sm">
                                {item.className}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Mobile Status Controls */}
                        <div
                          role="radiogroup"
                          aria-label={`${item.name} - ${
                            isPresent
                              ? t("present")
                              : isAbsent
                              ? t("absent")
                              : t("notRecorded")
                          }`}
                          className="grid grid-cols-2 gap-2 w-full"
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={isPresent}
                            disabled={!canEdit}
                            onClick={() => handleToggleStatus(item.id, true)}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                              isPresent
                                ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs font-bold"
                                : isUnrecorded
                                ? "bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-2xs hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/60",
                            )}
                          >
                            <Check
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                isPresent
                                  ? "stroke-[2.5]"
                                  : isUnrecorded
                                  ? "stroke-[2.5] text-emerald-600 dark:text-emerald-400"
                                  : "stroke-2",
                              )}
                            />
                            <span>{t("present")}</span>
                          </button>

                          <button
                            type="button"
                            role="radio"
                            aria-checked={isAbsent}
                            disabled={!canEdit}
                            onClick={() => handleToggleStatus(item.id, false)}
                            className={cn(
                              "inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer",
                              isAbsent
                                ? "bg-rose-600 text-white border border-rose-600 shadow-xs font-bold"
                                : isUnrecorded
                                ? "bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700 shadow-2xs hover:bg-rose-600 hover:text-white hover:border-rose-600"
                                : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:text-rose-700 hover:border-rose-300 hover:bg-rose-50/60",
                            )}
                          >
                            <X
                              className={cn(
                                "w-3.5 h-3.5 shrink-0",
                                isAbsent
                                  ? "stroke-[2.5]"
                                  : isUnrecorded
                                  ? "stroke-[2.5] text-rose-600 dark:text-rose-400"
                                  : "stroke-2",
                              )}
                            />
                            <span>{t("absent")}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {/* Client-Side Pagination & Footer */}
          {currentTotalCount > 0 && (
            <div className="border-t border-slate-200/80 dark:border-slate-800/80">
              {searchQuery.trim() && (
                <div className="px-4 py-2 bg-purple-50/50 dark:bg-purple-950/20 text-xs text-purple-700 dark:text-purple-300 border-b border-purple-100/50 dark:border-purple-900/30 flex items-center justify-between">
                  <span>{t("filteredBy", { query: searchQuery.trim() })}</span>
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="text-purple-600 hover:text-purple-800 dark:text-purple-400 font-semibold underline text-xs cursor-pointer"
                  >
                    {locale === "ar" ? "مسح البحث" : "Clear search"}
                  </button>
                </div>
              )}
              <Pagination
                page={safePage}
                count={currentTotalCount}
                pageSize={pageSize}
                pageSizeOptions={[10, 25, 50]}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
                onPageChange={setCurrentPage}
                className="border-t-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SIDE PANEL: Session Controls (Top on mobile, Right on desktop)        */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-72 xl:w-80 2xl:w-84 shrink-0 space-y-4 lg:sticky lg:top-6 order-1 lg:order-2">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5">
          {/* Card Title */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {t("sessionControls")}
              </h2>
            </div>
            <Badge
              variant={
                activeView === "weekly"
                  ? "outline"
                  : unrecordedCount === 0 && totalRecorded > 0
                  ? "success"
                  : "warning"
              }
              size="sm"
              dot={activeView !== "weekly"}
            >
              {activeView === "weekly"
                ? t("weeklyView")
                : unrecordedCount === 0 && totalRecorded > 0
                ? t("recorded")
                : totalRecorded > 0
                ? t("partiallyRecorded")
                : t("unrecorded")}
            </Badge>
          </div>

          {/* DATE & WEEK NAVIGATOR */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {activeView === "weekly" ? t("weekRange", { range: "" }) : t("date")}
            </label>

            {/* Quick shortcuts */}
            {activeView === "weekly" ? (
              <div className="grid grid-cols-3 gap-1.5">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleWeekOffset(-7)}
                  className="w-full text-[11px] font-semibold h-8 px-1"
                  title={t("previousWeek")}
                >
                  <ChevronLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                  <span className="hidden min-[400px]:inline">Prev</span>
                </Button>
                <Button
                  type="button"
                  variant={isToday ? "primary" : "secondary"}
                  size="sm"
                  onClick={handleShortcutToday}
                  className="w-full text-[11px] font-semibold h-8 px-1"
                >
                  {t("currentWeek")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => handleWeekOffset(7)}
                  className="w-full text-[11px] font-semibold h-8 px-1"
                  title={t("nextWeek")}
                >
                  <span className="hidden min-[400px]:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={isToday ? "primary" : "secondary"}
                  size="sm"
                  onClick={handleShortcutToday}
                  className="w-full text-xs font-semibold h-8"
                >
                  {t("today")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleShortcutYesterday}
                  className="w-full text-xs font-medium text-slate-700 dark:text-slate-300 h-8"
                >
                  {t("yesterday")}
                </Button>
              </div>
            )}

            {/* Native Date Picker */}
            <div className="relative">
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="date"
                aria-label={t("datePickerLabel")}
                value={selectedDate}
                min={academicYear.startDate}
                max={academicYear.endDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="h-9 ps-9 pe-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
              />
            </div>

            {/* Formatted Date Context */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <bdi>
                  {activeView === "weekly" && formattedWeekRange
                    ? formattedWeekRange
                    : formattedDisplayDate}
                </bdi>
              </span>
              {isNavigating && (
                <Loader2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 animate-spin" />
              )}
            </div>

            {!isToday && activeView === "daily" && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1.5 rounded-lg">
                <History className="w-3.5 h-3.5 shrink-0" />
                <span className="font-medium">{t("historicalRecord")}</span>
              </div>
            )}
          </div>

          {/* SCOPE & CLASS FILTERS */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("sessionFilters")}
            </label>

            {/* Admin Scope Switcher */}
            {role === "admin" && (
              <div
                role="tablist"
                aria-label="Attendance scope"
                className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "students"}
                  onClick={() => handleScopeChange("students")}
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center",
                    scope === "students"
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  {filtersT("students")}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={scope === "teachers"}
                  onClick={() => handleScopeChange("teachers")}
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center",
                    scope === "teachers"
                      ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
                  )}
                >
                  {filtersT("teachers")}
                </button>
              </div>
            )}

            {/* Admin Grade & Class Selectors */}
            {role === "admin" && scope === "students" && (
              <div
                className={cn(
                  "grid gap-2",
                  grades.length > 0 && classes.length > 0
                    ? "grid-cols-2"
                    : "grid-cols-1",
                )}
              >
                {grades.length > 0 && (
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                      {th("grade")}
                    </span>
                    <Select
                      value={selectedGradeId ? String(selectedGradeId) : "all"}
                      onChange={(e) => handleGradeChange(e.target.value)}
                      containerClassName="w-full"
                      className="text-xs"
                      aria-label={th("grade")}
                    >
                      <option value="all">
                        {filtersT("allGrades") || "All Grades"}
                      </option>
                      {grades.map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          {grade.level}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                {classes.length > 0 && (
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                      {th("class")}
                    </span>
                    <Select
                      value={effectiveClassId ? String(effectiveClassId) : ""}
                      onChange={(e) => handleClassSelect(e.target.value)}
                      containerClassName="w-full"
                      className="text-xs"
                      aria-label={th("class")}
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>
            )}

            {/* Teacher Supervised Class Selection */}
            {role === "teacher" && classes.length > 0 && (
              <div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1 block">
                  {th("class")}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {classes.map((cls) => {
                    const isActive = effectiveClassId === cls.id;
                    return (
                      <button
                        key={cls.id}
                        type="button"
                        onClick={() => handleTeacherClassTab(cls.id)}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                          isActive
                            ? "bg-purple-600 text-white shadow-xs font-bold"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900",
                        )}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* PRIMARY SAVE ACTION IN STICKY SIDE CARD                           */}
          {/* ================================================================= */}
          {canEdit && (
            activeView === "weekly" ? (
              /* Weekly Save Form */
              <form
                action={weeklyFormAction}
                className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
              >
                <input type="hidden" name="scope" value={scope} />
                <input
                  type="hidden"
                  name="changes"
                  value={JSON.stringify(weeklyDiffList)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("actions")}
                  </span>
                  {weeklyPendingCount > 0 ? (
                    <Badge variant="warning" size="sm" dot>
                      {weeklyPendingCount === 1
                        ? t("onePendingChange")
                        : t("pendingChanges", { count: weeklyPendingCount })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      {t("noPendingChanges")}
                    </Badge>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={weeklyPendingCount === 0 || isWeeklyPending}
                  loading={isWeeklyPending}
                  leftIcon={!isWeeklyPending ? <Save className="w-4 h-4" /> : undefined}
                  className={cn(
                    "w-full font-bold shadow-md transition-all text-xs md:text-sm py-2.5",
                    weeklyPendingCount > 0
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple ring-2 ring-purple-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700",
                  )}
                >
                  {isWeeklyPending
                    ? t("saving")
                    : weeklyPendingCount > 0
                    ? `${t("save")} (${weeklyPendingCount})`
                    : t("save")}
                </Button>

                {weeklyPendingCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isWeeklyPending}
                    onClick={handleReset}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    {t("resetChanges")}
                  </Button>
                )}
              </form>
            ) : (
              /* Daily Save Form */
              <form
                action={dailyFormAction}
                className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3"
              >
                <input type="hidden" name="date" value={selectedDate} />
                <input type="hidden" name="scope" value={scope} />
                <input
                  type="hidden"
                  name="changes"
                  value={JSON.stringify(dailyDiffChanges)}
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("actions")}
                  </span>
                  {dailyPendingCount > 0 ? (
                    <Badge variant="warning" size="sm" dot>
                      {dailyPendingCount === 1
                        ? t("onePendingChange")
                        : t("pendingChanges", { count: dailyPendingCount })}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" size="sm">
                      {t("noPendingChanges")}
                    </Badge>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={dailyPendingCount === 0 || isDailyPending}
                  loading={isDailyPending}
                  leftIcon={!isDailyPending ? <Save className="w-4 h-4" /> : undefined}
                  className={cn(
                    "w-full font-bold shadow-md transition-all text-xs md:text-sm py-2.5",
                    dailyPendingCount > 0
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-purple ring-2 ring-purple-500/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700",
                  )}
                >
                  {isDailyPending
                    ? t("saving")
                    : dailyPendingCount > 0
                    ? `${t("save")} (${dailyPendingCount})`
                    : t("save")}
                </Button>

                {dailyPendingCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isDailyPending}
                    onClick={handleReset}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    className="w-full text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    {t("resetChanges")}
                  </Button>
                )}
              </form>
            )
          )}

          {/* Academic Year Info Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{academicYear.name}</span>
            {!canEdit && (
              <span className="italic text-amber-600 dark:text-amber-400 font-medium">
                {t("readOnly")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
