import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calculator,
  FlaskConical,
  Compass,
  Palette,
  GraduationCap,
  Globe,
  Languages,
} from "lucide-react";

export type SubjectCardTheme = {
  id: string;
  cardBg: string;
  cardBorder: string;
  hoverBorder: string;
  iconBg: string;
  accentText: string;
  footerText: string;
  defaultIcon: LucideIcon;
};

export const SUBJECT_CARD_THEMES: SubjectCardTheme[] = [
  {
    id: "purple",
    cardBg: "bg-purple-50/75 hover:bg-purple-50/95 dark:bg-purple-950/25 dark:hover:bg-purple-950/40",
    cardBorder: "border-purple-200/80 dark:border-purple-900/50",
    hoverBorder: "hover:border-purple-300 dark:hover:border-purple-700/80",
    iconBg: "bg-purple-100/90 text-purple-700 border-purple-200/80 dark:bg-purple-900/60 dark:text-purple-300 dark:border-purple-800/60",
    accentText: "group-hover:text-purple-700 dark:group-hover:text-purple-300",
    footerText: "text-purple-700 dark:text-purple-300",
    defaultIcon: BookOpen,
  },
  {
    id: "sky",
    cardBg: "bg-sky-50/75 hover:bg-sky-50/95 dark:bg-sky-950/25 dark:hover:bg-sky-950/40",
    cardBorder: "border-sky-200/80 dark:border-sky-900/50",
    hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700/80",
    iconBg: "bg-sky-100/90 text-sky-700 border-sky-200/80 dark:bg-sky-900/60 dark:text-sky-300 dark:border-sky-800/60",
    accentText: "group-hover:text-sky-700 dark:group-hover:text-sky-300",
    footerText: "text-sky-700 dark:text-sky-300",
    defaultIcon: Calculator,
  },
  {
    id: "emerald",
    cardBg: "bg-emerald-50/75 hover:bg-emerald-50/95 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40",
    cardBorder: "border-emerald-200/80 dark:border-emerald-900/50",
    hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700/80",
    iconBg: "bg-emerald-100/90 text-emerald-700 border-emerald-200/80 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-800/60",
    accentText: "group-hover:text-emerald-700 dark:group-hover:text-emerald-300",
    footerText: "text-emerald-700 dark:text-emerald-300",
    defaultIcon: FlaskConical,
  },
  {
    id: "amber",
    cardBg: "bg-amber-50/75 hover:bg-amber-50/95 dark:bg-amber-950/25 dark:hover:bg-amber-950/40",
    cardBorder: "border-amber-200/80 dark:border-amber-900/50",
    hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700/80",
    iconBg: "bg-amber-100/90 text-amber-700 border-amber-200/80 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-800/60",
    accentText: "group-hover:text-amber-700 dark:group-hover:text-amber-300",
    footerText: "text-amber-700 dark:text-amber-300",
    defaultIcon: Compass,
  },
  {
    id: "rose",
    cardBg: "bg-rose-50/75 hover:bg-rose-50/95 dark:bg-rose-950/25 dark:hover:bg-rose-950/40",
    cardBorder: "border-rose-200/80 dark:border-rose-900/50",
    hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700/80",
    iconBg: "bg-rose-100/90 text-rose-700 border-rose-200/80 dark:bg-rose-900/60 dark:text-rose-300 dark:border-rose-800/60",
    accentText: "group-hover:text-rose-700 dark:group-hover:text-rose-300",
    footerText: "text-rose-700 dark:text-rose-300",
    defaultIcon: Palette,
  },
  {
    id: "indigo",
    cardBg: "bg-indigo-50/75 hover:bg-indigo-50/95 dark:bg-indigo-950/25 dark:hover:bg-indigo-950/40",
    cardBorder: "border-indigo-200/80 dark:border-indigo-900/50",
    hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700/80",
    iconBg: "bg-indigo-100/90 text-indigo-700 border-indigo-200/80 dark:bg-indigo-900/60 dark:text-indigo-300 dark:border-indigo-800/60",
    accentText: "group-hover:text-indigo-700 dark:group-hover:text-indigo-300",
    footerText: "text-indigo-700 dark:text-indigo-300",
    defaultIcon: GraduationCap,
  },
  {
    id: "teal",
    cardBg: "bg-teal-50/75 hover:bg-teal-50/95 dark:bg-teal-950/25 dark:hover:bg-teal-950/40",
    cardBorder: "border-teal-200/80 dark:border-teal-900/50",
    hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700/80",
    iconBg: "bg-teal-100/90 text-teal-700 border-teal-200/80 dark:bg-teal-900/60 dark:text-teal-300 dark:border-teal-800/60",
    accentText: "group-hover:text-teal-700 dark:group-hover:text-teal-300",
    footerText: "text-teal-700 dark:text-teal-300",
    defaultIcon: Globe,
  },
  {
    id: "violet",
    cardBg: "bg-violet-50/75 hover:bg-violet-50/95 dark:bg-violet-950/25 dark:hover:bg-violet-950/40",
    cardBorder: "border-violet-200/80 dark:border-violet-900/50",
    hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700/80",
    iconBg: "bg-violet-100/90 text-violet-700 border-violet-200/80 dark:bg-violet-900/60 dark:text-violet-300 dark:border-violet-800/60",
    accentText: "group-hover:text-violet-700 dark:group-hover:text-violet-300",
    footerText: "text-violet-700 dark:text-violet-300",
    defaultIcon: Languages,
  },
];

export function getSubjectCardTheme(
  id: number | string,
  index?: number,
): SubjectCardTheme {
  const seed =
    typeof index === "number"
      ? index
      : typeof id === "number"
        ? id
        : Math.abs(id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const themeIndex = Math.abs(seed) % SUBJECT_CARD_THEMES.length;
  return SUBJECT_CARD_THEMES[themeIndex];
}
