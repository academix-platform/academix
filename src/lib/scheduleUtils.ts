import type { SchoolScheduleSettings } from "./schoolSettings";
import type { SchoolWeekDay } from "./schoolCalendar";

export type SubjectCategory =
  | "math"
  | "arabic"
  | "english"
  | "science"
  | "social"
  | "creative"
  | "other";

export type SubjectTheme = {
  bgHex: string;
  borderHex: string;
  accentHex: string;
  card: string;
  badge: string;
  accent: string;
  text: string;
  iconBg: string;
  categoryIcon: "calculator" | "book" | "globe" | "flask" | "landmark" | "palette" | "sparkles";
};

export const subjectThemes: Record<SubjectCategory, SubjectTheme> = {
  arabic: {
    bgHex: "#FFEDD5", // Warm Terracotta / Orange
    borderHex: "#FED7AA",
    accentHex: "#EA580C",
    card: "bg-orange-100 border-orange-300/80 text-orange-950 dark:bg-orange-950/60 dark:border-orange-800 dark:text-orange-100 hover:border-orange-400 hover:shadow-xs",
    badge: "bg-orange-200 text-orange-950 dark:bg-orange-900 dark:text-orange-200 border border-orange-300",
    accent: "bg-orange-500",
    text: "text-orange-950 dark:text-orange-100",
    iconBg: "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 border border-orange-200 shadow-2xs",
    categoryIcon: "book",
  },
  math: {
    bgHex: "#E0F2FE", // Vibrant Sky / Cyan Blue
    borderHex: "#BAE6FD",
    accentHex: "#0284C7",
    card: "bg-sky-100 border-sky-300/80 text-sky-950 dark:bg-sky-950/60 dark:border-sky-800 dark:text-sky-100 hover:border-sky-400 hover:shadow-xs",
    badge: "bg-sky-200 text-sky-950 dark:bg-sky-900 dark:text-sky-200 border border-sky-300",
    accent: "bg-sky-500",
    text: "text-sky-950 dark:text-sky-100",
    iconBg: "bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 border border-sky-200 shadow-2xs",
    categoryIcon: "calculator",
  },
  science: {
    bgHex: "#DCFCE7", // Fresh Mint / Meadow Green
    borderHex: "#BBF7D0",
    accentHex: "#16A34A",
    card: "bg-emerald-100 border-emerald-300/80 text-emerald-950 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-100 hover:border-emerald-400 hover:shadow-xs",
    badge: "bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-200 border border-emerald-300",
    accent: "bg-emerald-500",
    text: "text-emerald-950 dark:text-emerald-100",
    iconBg: "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 shadow-2xs",
    categoryIcon: "flask",
  },
  english: {
    bgHex: "#F3E8FF", // Royal Purple / Violet
    borderHex: "#E9D5FF",
    accentHex: "#9333EA",
    card: "bg-purple-100 border-purple-300/80 text-purple-950 dark:bg-purple-950/60 dark:border-purple-800 dark:text-purple-100 hover:border-purple-400 hover:shadow-xs",
    badge: "bg-purple-200 text-purple-950 dark:bg-purple-900 dark:text-purple-200 border border-purple-300",
    accent: "bg-purple-500",
    text: "text-purple-950 dark:text-purple-100",
    iconBg: "bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 border border-purple-200 shadow-2xs",
    categoryIcon: "globe",
  },
  social: {
    bgHex: "#FEF3C7", // Golden Amber / Honey
    borderHex: "#FDE68A",
    accentHex: "#D97706",
    card: "bg-amber-100 border-amber-300/80 text-amber-950 dark:bg-amber-950/60 dark:border-amber-800 dark:text-amber-100 hover:border-amber-400 hover:shadow-xs",
    badge: "bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-200 border border-amber-300",
    accent: "bg-amber-500",
    text: "text-amber-950 dark:text-amber-100",
    iconBg: "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border border-amber-200 shadow-2xs",
    categoryIcon: "landmark",
  },
  creative: {
    bgHex: "#FFE4E6", // Soft Coral / Rose Pink
    borderHex: "#FECDD3",
    accentHex: "#E11D48",
    card: "bg-rose-100 border-rose-300/80 text-rose-950 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-100 hover:border-rose-400 hover:shadow-xs",
    badge: "bg-rose-200 text-rose-950 dark:bg-rose-900 dark:text-rose-200 border border-rose-300",
    accent: "bg-rose-500",
    text: "text-rose-950 dark:text-rose-100",
    iconBg: "bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 border border-rose-200 shadow-2xs",
    categoryIcon: "palette",
  },
  other: {
    bgHex: "#F1F5F9", // Slate Neutral
    borderHex: "#E2E8F0",
    accentHex: "#64748B",
    card: "bg-slate-100 border-slate-300/80 text-slate-900 dark:bg-slate-900/60 dark:border-slate-800 dark:text-slate-100 hover:border-slate-400 hover:shadow-xs",
    badge: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300",
    accent: "bg-slate-500",
    text: "text-slate-900 dark:text-slate-100",
    iconBg: "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 shadow-2xs",
    categoryIcon: "sparkles",
  },
};

const ARABIC_SUBJECT_TRANSLATIONS: Record<string, string> = {
  mathematics: "الرياضيات",
  math: "الرياضيات",
  arabic: "اللغة العربية",
  english: "اللغة الإنجليزية",
  science: "العلوم",
  physics: "الفيزياء",
  chemistry: "الكيمياء",
  biology: "الأحياء",
  islamic: "التربية الإسلامية",
  social: "الدراسات الاجتماعية",
  history: "التاريخ",
  geography: "الجغرافيا",
  pe: "التربية الرياضية",
  art: "التربية الفنية",
  computer: "الحاسوب وتقنية المعلومات",
  french: "اللغة الفرنسية",
};

export const sanitizeSubjectName = (rawName: string, locale: string = "ar"): string => {
  if (!rawName) return "";
  const cleaned = rawName.replace(/[-_]G\d+/i, "").replace(/[-_]Grade\d+/i, "").trim();

  if (locale === "ar") {
    const key = cleaned.toLowerCase();
    if (ARABIC_SUBJECT_TRANSLATIONS[key]) {
      return ARABIC_SUBJECT_TRANSLATIONS[key];
    }
  }

  return cleaned;
};

export const getSubjectCategory = (rawName: string): SubjectCategory => {
  const norm = rawName.toLowerCase();
  if (norm.includes("arabic") || norm.includes("عربي") || norm.includes("لغة عربية")) {
    return "arabic";
  }
  if (norm.includes("math") || norm.includes("رياضيات") || norm.includes("algebra") || norm.includes("geometry")) {
    return "math";
  }
  if (
    norm.includes("science") ||
    norm.includes("علوم") ||
    norm.includes("physic") ||
    norm.includes("فيزياء") ||
    norm.includes("chem") ||
    norm.includes("كيمياء") ||
    norm.includes("bio") ||
    norm.includes("أحياء")
  ) {
    return "science";
  }
  if (norm.includes("english") || norm.includes("إنجليزي") || norm.includes("انجليزي") || norm.includes("french") || norm.includes("فرنسي")) {
    return "english";
  }
  if (
    norm.includes("social") ||
    norm.includes("اجتماع") ||
    norm.includes("islamic") ||
    norm.includes("إسلام") ||
    norm.includes("دين") ||
    norm.includes("histor") ||
    norm.includes("تاريخ") ||
    norm.includes("geograph") ||
    norm.includes("جغرافيا")
  ) {
    return "social";
  }
  if (norm.includes("art") || norm.includes("فنية") || norm.includes("pe") || norm.includes("رياضة") || norm.includes("music") || norm.includes("موسيقى")) {
    return "creative";
  }
  return "other";
};

export const dayOffsets: Record<SchoolWeekDay, number> = {
  SATURDAY: 0,
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
};

export const jsDayToSchoolDayMap: Record<number, SchoolWeekDay> = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

export const getLatestSaturday = (referenceDate: Date = new Date()): Date => {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay();
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  date.setDate(date.getDate() - daysSinceSaturday);
  date.setHours(0, 0, 0, 0);
  return date;
};

export type TimetableSlotTime = {
  slot: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  startFormatted: string;
  endFormatted: string;
  formattedRange: string;
};

export const computeSlotTimes = (
  settings: SchoolScheduleSettings,
  maxSlotToRender?: number,
): TimetableSlotTime[] => {
  const slots: TimetableSlotTime[] = [];
  const startBaseMinutes = settings.workDayStartHour * 60 + settings.workDayStartMinute;
  const count = maxSlotToRender ?? settings.lessonsPerDay;

  for (let slot = 1; slot <= count; slot++) {
    const slotStartTotal = startBaseMinutes + (slot - 1) * settings.lessonDurationMinutes;
    const slotEndTotal = slotStartTotal + settings.lessonDurationMinutes;

    const startH = Math.floor(slotStartTotal / 60);
    const startM = slotStartTotal % 60;
    const endH = Math.floor(slotEndTotal / 60);
    const endM = slotEndTotal % 60;

    const pad = (n: number) => String(n).padStart(2, "0");
    const startFormatted = `${pad(startH)}:${pad(startM)}`;
    const endFormatted = `${pad(endH)}:${pad(endM)}`;
    const formattedRange = `${startFormatted} – ${endFormatted}`;

    slots.push({
      slot,
      startHour: startH,
      startMinute: startM,
      endHour: endH,
      endMinute: endM,
      startFormatted,
      endFormatted,
      formattedRange,
    });
  }

  return slots;
};

export type TimetableDayInfo = {
  day: SchoolWeekDay;
  date: Date;
  dayName: string;
  formattedDate: string;
  isToday: boolean;
};

export const computeWeekDays = (
  workingDays: SchoolWeekDay[],
  locale: string = "ar",
  referenceDate: Date = new Date(),
): TimetableDayInfo[] => {
  const latestSaturday = getLatestSaturday(referenceDate);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const dateFormatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });

  return workingDays.map((day) => {
    const offset = dayOffsets[day];
    const date = new Date(latestSaturday);
    date.setDate(latestSaturday.getDate() + offset);

    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    return {
      day,
      date,
      dayName: dayFormatter.format(date),
      formattedDate: dateFormatter.format(date),
      isToday,
    };
  });
};

export const parseSlotFromLesson = (
  lessonName: string | undefined,
  startTime: Date | string,
  settings: SchoolScheduleSettings,
): number => {
  if (lessonName) {
    const match = /lesson\s*(\d+)/i.exec(lessonName);
    if (match) {
      const slot = Number(match[1]);
      if (!Number.isNaN(slot) && slot >= 1 && slot <= settings.lessonsPerDay) {
        return slot;
      }
    }
  }

  const date = new Date(startTime);
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  const startBaseMinutes = settings.workDayStartHour * 60 + settings.workDayStartMinute;
  const diff = totalMinutes - startBaseMinutes;

  if (diff >= 0) {
    const slot = Math.floor(diff / settings.lessonDurationMinutes) + 1;
    if (slot >= 1 && slot <= settings.lessonsPerDay) {
      return slot;
    }
  }

  return 1;
};

export type TimetableItem = {
  id: number;
  slot: number;
  day: SchoolWeekDay;
  rawSubject: string;
  subjectName: string;
  className: string;
  teacherName: string;
  category: SubjectCategory;
  startTimeStr: string;
  endTimeStr: string;
};
