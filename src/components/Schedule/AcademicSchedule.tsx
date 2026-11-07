"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CalendarDays,
  Clock,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Calculator,
  BookOpen,
  Languages,
  FlaskConical,
  Landmark,
  Palette,
  User,
  Calendar,
  ArrowLeftRight,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  type TimetableItem,
  type TimetableDayInfo,
  type SubjectCategory,
  computeSlotTimes,
  computeWeekDays,
  subjectThemes,
  jsDayToSchoolDayMap,
} from "@/lib/scheduleUtils";
import type { SchoolScheduleSettings } from "@/lib/schoolSettings";
import type { SchoolWeekDay } from "@/lib/schoolCalendar";

const CategoryIcon = ({
  category,
  className = "w-4 h-4",
}: {
  category: SubjectCategory;
  className?: string;
}) => {
  switch (category) {
    case "math":
      return <Calculator className={className} />;
    case "arabic":
      return <BookOpen className={className} />;
    case "english":
      return <Languages className={className} />;
    case "science":
      return <FlaskConical className={className} />;
    case "social":
      return <Landmark className={className} />;
    case "creative":
      return <Palette className={className} />;
    default:
      return <Sparkles className={className} />;
  }
};

type AcademicScheduleProps = {
  items: TimetableItem[];
  settings: SchoolScheduleSettings;
  role: "teacher" | "student" | "parent";
  locale?: string;
  childName?: string;
  className?: string;
};

export default function AcademicSchedule({
  items,
  settings,
  role,
  locale = "ar",
  childName,
  className = "",
}: AcademicScheduleProps) {
  const t = useTranslations("academicSchedule");

  const [viewMode, setViewMode] = useState<"week" | "day">("week");
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Determine today's school day
  const todaySchoolDay = useMemo(
    () => jsDayToSchoolDayMap[currentTime.getDay()],
    [currentTime],
  );
  const isTodayWorkingDay = settings.workingDays.includes(todaySchoolDay);

  // Active day is determined automatically based on today's school day; cannot be changed manually
  const activeDay = useMemo<SchoolWeekDay>(
    () => (isTodayWorkingDay ? todaySchoolDay : (settings.workingDays[0] || "SUNDAY")),
    [isTodayWorkingDay, todaySchoolDay, settings.workingDays],
  );

  // Selected day for the Daily timeline view tabs (defaults to the automatic activeDay)
  const [selectedDay, setSelectedDay] = useState<SchoolWeekDay | null>(null);
  const currentDailyDay = selectedDay || activeDay;

  // Automatically switch to Daily view on small screens (mobile phones < 640px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setViewMode("day");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearInterval(interval);
    };
  }, []);

  // Compute maximum scheduled slot to prevent endless empty bottom rows
  const maxSlotInSchedule = useMemo(() => {
    if (items.length === 0) return settings.lessonsPerDay;
    const maxItemSlot = Math.max(...items.map((i) => i.slot));
    return Math.max(maxItemSlot, 4); // Always show at least 4 periods
  }, [items, settings.lessonsPerDay]);

  const slotTimes = useMemo(
    () => computeSlotTimes(settings, maxSlotInSchedule),
    [settings, maxSlotInSchedule],
  );

  const weekDays = useMemo(
    () => computeWeekDays(settings.workingDays, locale, currentTime),
    [settings.workingDays, locale, currentTime],
  );

  // Group lessons by `day_slot` key for instant O(1) lookup
  const lessonsMap = useMemo(() => {
    const map = new Map<string, TimetableItem>();
    items.forEach((item) => {
      const key = `${item.day}_${item.slot}`;
      map.set(key, item);
    });
    return map;
  }, [items]);

  const isSlotLiveNow = (dayInfo: TimetableDayInfo, slotTime: (typeof slotTimes)[0]) => {
    if (!dayInfo.isToday) return false;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const startMinutes = slotTime.startHour * 60 + slotTime.startMinute;
    const endMinutes = slotTime.endHour * 60 + slotTime.endMinute;
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  };

  const isSlotPassed = (dayInfo: TimetableDayInfo, slotTime: (typeof slotTimes)[0]) => {
    if (!dayInfo.isToday) return false;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const endMinutes = slotTime.endHour * 60 + slotTime.endMinute;
    return nowMinutes >= endMinutes;
  };

  const weekRangeTitle = useMemo(() => {
    if (weekDays.length === 0) return "";
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    return `${first.dayName} ${first.formattedDate} – ${last.dayName} ${last.formattedDate}`;
  }, [weekDays]);

  const dailyDayInfo = useMemo(() => {
    return (
      weekDays.find((d) => d.day === currentDailyDay) || {
        day: currentDailyDay,
        date: currentTime,
        dayName: currentDailyDay,
        formattedDate: "",
        isToday: currentDailyDay === todaySchoolDay,
      }
    );
  }, [weekDays, currentDailyDay, currentTime, todaySchoolDay]);

  return (
    <div className={`space-y-4 w-full min-w-0 ${className}`}>
      {/* 1. TOP TOOLBAR & VIEW SWITCHER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-outline/70 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-extrabold text-base sm:text-lg text-content-primary tracking-tight truncate">
              {t("title")}
            </h2>
            {childName && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brandPurple-50 dark:bg-brandPurple-950/40 text-brandPurple-700 dark:text-brandPurple-300 border border-brandPurple-200/80 shadow-2xs truncate">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{childName}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-content-muted mt-0.5 flex items-center gap-1.5 font-medium truncate">
            <CalendarDays className="w-3.5 h-3.5 text-content-subtle shrink-0" />
            <span className="truncate">{weekRangeTitle}</span>
          </p>
        </div>

        {/* View Switcher: Week vs Daily Timeline */}
        <div className="inline-flex items-center p-1 rounded-xl bg-surface-muted border border-outline/80 shadow-2xs self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("week")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === "week"
                ? "bg-surface text-brandPurple-700 dark:text-brandPurple-300 shadow-xs border border-outline/60"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            {t("viewWeek")}
          </button>
          <button
            type="button"
            onClick={() => setViewMode("day")}
            className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "day"
                ? "bg-surface text-brandPurple-700 dark:text-brandPurple-300 shadow-xs border border-outline/60"
                : "text-content-secondary hover:text-content-primary"
            }`}
          >
            <span>{t("viewDay")}</span>
            {isTodayWorkingDay && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* 2. WEEKLY TIMETABLE - COMPACT HORIZONTAL LAYOUT ("الجدول بالعرض") */}
      {viewMode === "week" && (
        <div className="space-y-3 w-full min-w-0">
          {/* Subtle swipe hint for smaller screens */}
          <div className="flex sm:hidden items-center justify-between px-2 text-[10px] text-content-subtle font-medium">
            <span className="flex items-center gap-1.5 text-brandPurple-700 dark:text-brandPurple-300">
              <ArrowLeftRight className="w-3 h-3" />
              <span>{t("swipeHint")}</span>
            </span>
            <span className="font-mono">{slotTimes.length} {t("periods")}</span>
          </div>

          <div className="bg-surface border border-outline/80 rounded-2xl shadow-2xs overflow-hidden w-full min-w-0">
            <div className="overflow-x-auto w-full">
              <div
                className="grid text-xs min-w-[640px] w-full"
                style={{
                  gridTemplateColumns: `minmax(58px, 74px) repeat(${slotTimes.length}, minmax(120px, 1fr))`,
                }}
              >
                {/* Header Row: Days Corner (Sticky at start) + Period Columns */}
                <div className="sticky start-0 z-20 px-1.5 sm:px-2 py-2 bg-surface-muted/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-inline-end border-outline/80 font-bold text-content-secondary flex items-center justify-center text-center shadow-xs">
                  <span className="text-[11px] sm:text-xs uppercase tracking-wider">{t("days")}</span>
                </div>

                {slotTimes.map((slotTime) => (
                  <div
                    key={slotTime.slot}
                    className="p-2 sm:p-2.5 bg-surface-muted/40 border-b border-inline-end border-outline/70 flex flex-col items-center justify-center text-center"
                  >
                    <span className="font-extrabold text-content-primary text-[11px] sm:text-xs">
                      {t("periodNumber", { number: slotTime.slot })}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-content-muted font-mono mt-0.5 font-semibold">
                      {slotTime.startFormatted} – {slotTime.endFormatted}
                    </span>
                  </div>
                ))}

                {/* Day Rows: One row per day */}
                {weekDays.map((dayInfo) => {
                  const isActive = dayInfo.day === activeDay;

                  return (
                    <div key={dayInfo.day} className="contents group">
                      {/* Day Header Column: Clean day name only, determined automatically, non-interactive */}
                      <div
                        className={`sticky start-0 z-10 px-1 sm:px-2 py-2 border-b border-inline-end border-outline/80 flex items-center justify-center text-center select-none shadow-xs ${
                          isActive
                            ? "bg-brandPurple-600 text-white font-black ring-2 ring-brandPurple-400/80 ring-inset"
                            : "bg-surface-muted/95 dark:bg-slate-900/95 backdrop-blur-xs text-content-primary font-bold"
                        }`}
                      >
                        <span
                          className={`text-xs sm:text-sm font-extrabold tracking-tight truncate ${
                            isActive ? "text-white" : "text-content-primary"
                          }`}
                        >
                          {dayInfo.dayName}
                        </span>
                      </div>

                      {/* Period Cells for this day */}
                      {slotTimes.map((slotTime) => {
                        const key = `${dayInfo.day}_${slotTime.slot}`;
                        const lesson = lessonsMap.get(key);
                        const isLive = isSlotLiveNow(dayInfo, slotTime);
                        const isPassed = isSlotPassed(dayInfo, slotTime);
                        const theme = lesson ? subjectThemes[lesson.category] : null;

                        return (
                          <div
                            key={key}
                            className={`p-1.5 sm:p-2 border-b border-inline-end border-outline/50 flex flex-col justify-center min-h-[88px] sm:min-h-[100px] transition-colors ${
                              isActive
                                ? "bg-slate-100/85 dark:bg-slate-800/60"
                                : "hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
                            }`}
                          >
                            {lesson && theme ? (
                              <div
                                style={{
                                  backgroundColor: theme.bgHex,
                                  borderColor: theme.borderHex,
                                }}
                                className={`h-full w-full rounded-xl sm:rounded-2xl border p-2 sm:p-2.5 flex flex-col justify-between shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs relative overflow-hidden group/card ${
                                  isLive ? "ring-2 ring-brandPurple-500 shadow-xs" : ""
                                } ${isPassed ? "opacity-80" : ""}`}
                              >
                                <div
                                  style={{ backgroundColor: theme.accentHex }}
                                  className="absolute top-0 inset-x-0 h-1 sm:h-1.5"
                                />

                                <div className="pt-0.5 flex items-center justify-between gap-1">
                                  <div
                                    className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg shrink-0 ${theme.iconBg}`}
                                  >
                                    <CategoryIcon category={lesson.category} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                  </div>

                                  <span
                                    style={{ borderColor: theme.borderHex }}
                                    className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 sm:py-0.5 rounded truncate max-w-[70px] ${theme.badge}`}
                                  >
                                    <bdi dir="auto">
                                      {role === "teacher"
                                        ? t("class", { name: lesson.className })
                                        : lesson.className || t("minutes", { minutes: settings.lessonDurationMinutes })}
                                    </bdi>
                                  </span>
                                </div>

                                <div className="my-1">
                                  <h3
                                    className={`font-extrabold text-[11px] sm:text-xs md:text-sm leading-snug line-clamp-1 ${theme.text}`}
                                    title={lesson.subjectName}
                                  >
                                    <bdi dir="auto">{lesson.subjectName}</bdi>
                                  </h3>
                                </div>

                                <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-content-muted pt-1 border-t border-black/5 dark:border-white/5">
                                  <span className="truncate flex items-center gap-1 font-medium text-content-secondary max-w-[85px]">
                                    <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-content-subtle shrink-0" />
                                    <bdi dir="auto">{lesson.teacherName}</bdi>
                                  </span>

                                  {isLive && (
                                    <span className="flex items-center gap-1 shrink-0 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[8px] sm:text-[9px] font-bold shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                      <span>{t("liveNow")}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="h-full w-full rounded-xl sm:rounded-2xl border border-dashed border-outline/50 bg-surface-muted/20 hover:bg-surface-muted/40 transition-colors flex items-center justify-center text-center p-1 text-[10px] text-content-subtle select-none">
                                <span>—</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DAILY TIMELINE / AGENDA VIEW (ZERO-SCROLL MOBILE & FOCUS MODE) */}
      {viewMode === "day" && (
        <div className="space-y-4 w-full min-w-0">
          {/* Day Selector Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar border-b border-outline/60 min-w-0">
            {weekDays.map((d) => {
              const isSelected = d.day === currentDailyDay;
              const dayLessonCount = items.filter((i) => i.day === d.day).length;

              return (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => setSelectedDay(d.day)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
                    isSelected
                      ? "bg-brandPurple-600 text-white shadow-xs"
                      : "bg-surface-muted text-content-secondary hover:text-content-primary hover:bg-surface-muted/80 border border-outline/70"
                  }`}
                >
                  <div className="flex flex-col items-start leading-tight">
                    <span className="text-[11px]">{d.dayName}</span>
                    <span className={`text-[10px] font-mono ${isSelected ? "text-purple-100" : "text-content-muted"}`}>
                      {d.date.getDate()}
                    </span>
                  </div>
                  {d.isToday && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isSelected ? "bg-white/20 text-white" : "bg-brandPurple-100 dark:bg-brandPurple-950/60 text-brandPurple-700 dark:text-brandPurple-300"
                      }`}
                    >
                      {t("todayBadge")}
                    </span>
                  )}
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                      isSelected ? "bg-white/20 text-white" : "bg-surface text-content-muted border border-outline/60"
                    }`}
                  >
                    {dayLessonCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Lessons List for the Selected Day */}
          <div className="bg-surface border border-outline/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 w-full">
            <div className="flex items-center justify-between pb-2 border-b border-outline/60">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
                <span className="font-extrabold text-sm sm:text-base text-content-primary">
                  {dailyDayInfo.dayName} {dailyDayInfo.formattedDate}
                </span>
                {dailyDayInfo.isToday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brandPurple-50 dark:bg-brandPurple-950/40 text-brandPurple-700 dark:text-brandPurple-300 border border-brandPurple-200">
                    {t("todayBadge")}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-content-muted">
                {items.filter((i) => i.day === currentDailyDay).length} {t("periods")}
              </span>
            </div>

            <div className="space-y-2.5">
              {slotTimes.map((slotTime) => {
                const key = `${currentDailyDay}_${slotTime.slot}`;
                const lesson = lessonsMap.get(key);
                const isLive = isSlotLiveNow(dailyDayInfo, slotTime);
                const isPassed = isSlotPassed(dailyDayInfo, slotTime);

                if (!lesson) {
                  return (
                    <div
                      key={slotTime.slot}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-outline/70 bg-surface-muted/30 text-xs text-content-muted"
                    >
                      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-content-subtle">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slotTime.formattedRange}</span>
                      </div>
                      <span className="text-[11px] font-medium text-content-subtle">
                        {t("periodNumber", { number: slotTime.slot })} — {t("freePeriod")}
                      </span>
                    </div>
                  );
                }

                const theme = subjectThemes[lesson.category];

                return (
                  <div
                    key={slotTime.slot}
                    style={{
                      backgroundColor: theme.bgHex,
                      borderColor: theme.borderHex,
                    }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                      isLive ? "ring-2 ring-brandPurple-500 shadow-xs" : ""
                    } ${isPassed ? "opacity-80" : ""}`}
                  >
                    {/* Left: Time & Subject with Icon */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${theme.iconBg}`}
                      >
                        <CategoryIcon category={lesson.category} className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4
                            className={`font-extrabold text-sm sm:text-base leading-snug ${
                              theme.text
                            }`}
                          >
                            <bdi dir="auto">{lesson.subjectName}</bdi>
                          </h4>
                          {isLive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                              <span>{t("liveNow")}</span>
                            </span>
                          )}
                          {isPassed && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-surface-muted text-content-muted text-[10px] font-medium border border-outline/60">
                              <CheckCircle2 className="w-3 h-3 text-content-subtle" />
                              <span>{t("completed")}</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-content-secondary flex items-center gap-2 font-medium flex-wrap">
                          {role === "teacher" && (
                            <span>
                              <bdi dir="auto">{t("class", { name: lesson.className })}</bdi>
                            </span>
                          )}
                          {(role === "student" || role === "parent") && (
                            <span>
                              <bdi dir="auto">{t("teacher", { name: lesson.teacherName })}</bdi>
                            </span>
                          )}
                          {role === "parent" && (
                            <span>
                              • <bdi dir="auto">{t("class", { name: lesson.className })}</bdi>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Right: Time Range Badge */}
                    <div className="self-end sm:self-auto shrink-0 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface border border-outline/80 text-content-secondary shadow-2xs font-mono">
                        <Clock className="w-3.5 h-3.5 text-content-subtle" />
                        <span>{slotTime.formattedRange}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
