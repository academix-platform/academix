/**
 * Academix Design System — TypeScript Token Definitions
 * Provides type-safe access to raw values, semantic tokens, and component specifications.
 */

export const primitives = {
  purple: {
    50: "#faf7fd",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#cfceff", // Signature Pastel Tint
    400: "#a855f7",
    500: "#8b5cf6",
    600: "#7c3aed", // Signature Primary Interactive
    700: "#6d28d9", // Hover
    800: "#5b21b6", // Active
    900: "#3b1b76", // Brand Slate
    950: "#24104f", // Brand Deep Ink
  },
  neutral: {
    0: "#ffffff",
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    700: "#b45309",
    800: "#92400e",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
  },
} as const;

export const spacing = {
  0.5: "2px",
  1: "4px",
  1.5: "6px",
  2: "8px",
  2.5: "10px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radii = {
  xs: "4px",
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "24px",
  full: "9999px",
} as const;

export const shadows = {
  xs: "0 1px 2px 0 rgba(15, 23, 42, 0.05)",
  sm: "0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.04)",
  md: "0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
  lg: "0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
  xl: "0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
  purple: "0 4px 14px 0 rgba(124, 58, 237, 0.28)",
} as const;

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

export const typography = {
  fonts: {
    sans: "var(--font-sans)",
    arabic: "var(--font-arabic)",
    cairo: "var(--font-cairo)",
    ibmArabic: "var(--font-ibm-arabic)",
    poppins: "var(--font-poppins)",
    mono: "var(--font-mono)",
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  scale: {
    display: {
      size: "clamp(2rem, 3.5vw, 2.75rem)",
      lhEn: 1.2,
      lhAr: 1.35,
      weight: 700,
      trackingEn: "-0.025em",
      trackingAr: "0em",
    },
    title1: {
      size: "clamp(1.5rem, 2.5vw, 2rem)",
      lhEn: 1.25,
      lhAr: 1.4,
      weight: 700,
      trackingEn: "-0.02em",
      trackingAr: "0em",
    },
    title2: {
      size: "clamp(1.25rem, 1.8vw, 1.5rem)",
      lhEn: 1.3,
      lhAr: 1.45,
      weight: 600,
      trackingEn: "-0.015em",
      trackingAr: "0em",
    },
    title3: {
      size: "1.125rem",
      lhEn: 1.4,
      lhAr: 1.5,
      weight: 600,
      trackingEn: "-0.01em",
      trackingAr: "0em",
    },
    body: {
      size: "0.9375rem",
      lhEn: 1.5,
      lhAr: 1.65,
      weight: 400,
      trackingEn: "-0.01em",
      trackingAr: "0em",
    },
    bodySm: {
      size: "0.8125rem",
      lhEn: 1.5,
      lhAr: 1.65,
      weight: 400,
      trackingEn: "-0.005em",
      trackingAr: "0em",
    },
    caption: {
      size: "0.75rem",
      lhEn: 1.4,
      lhAr: 1.55,
      weight: 500,
      trackingEn: "0em",
      trackingAr: "0em",
      usage: "Secondary helper text, badge pills, metadata (requires min 4.5:1 contrast)",
    },
    micro: {
      size: "0.6875rem",
      lhEn: 1.35,
      lhAr: 1.5,
      weight: 500,
      trackingEn: "0.01em",
      trackingAr: "0em",
      usage: "Non-critical timestamps and micro status pills only; forbidden for form labels or table primary cells",
    },
  },
  accessibility: {
    minLabelSize: "0.8125rem", // 13px (bodySm) - Form labels must never drop below 13px
    minDataCellSize: "0.8125rem", // 13px (bodySm) - Table data cells must be legible
    minContrastRatio: "4.5:1", // WCAG AA for normal text
    restrictedTokens: ["micro", "caption"] as const,
  },
} as const;

export const semantics = {
  light: {
    canvas: primitives.neutral[50],
    canvasSubtle: primitives.purple[50],
    surface: primitives.neutral[0],
    surfaceMuted: primitives.neutral[100],
    surfaceElevated: primitives.neutral[0],
    surfaceSidebar: primitives.purple[950],
    textPrimary: primitives.neutral[900],
    textSecondary: primitives.neutral[600],
    textMuted: primitives.neutral[500],
    textSubtle: primitives.neutral[400],
    textInverse: primitives.neutral[0],
    textBrand: primitives.purple[600],
    borderSubtle: primitives.neutral[100],
    borderDefault: primitives.neutral[200],
    borderStrong: primitives.neutral[300],
    primary: primitives.purple[600],
    primaryHover: primitives.purple[700],
    primaryActive: primitives.purple[800],
    primarySubtle: primitives.purple[100],
    success: primitives.emerald[600],
    warning: primitives.amber[500],
    error: primitives.rose[600],
    info: primitives.sky[600],
  },
  dark: {
    canvas: primitives.neutral[950],
    canvasSubtle: "#0d0b18",
    surface: primitives.neutral[900],
    surfaceMuted: primitives.neutral[800],
    surfaceElevated: "#161b2e",
    surfaceSidebar: "#0f0723",
    textPrimary: "#f8fafc",
    textSecondary: "#cbd5e1",
    textMuted: "#94a3b8",
    textSubtle: "#64748b",
    textInverse: primitives.neutral[950],
    textBrand: "#a855f7",
    borderSubtle: "#1e293b",
    borderDefault: "#334155",
    borderStrong: "#475569",
    primary: "#8b5cf6",
    primaryHover: "#7c3aed",
    primaryActive: "#6d28d9",
    primarySubtle: "rgba(124, 58, 237, 0.2)",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#f43f5e",
    info: "#0ea5e9",
  },
} as const;

export type ThemeMode = "light" | "dark";
export type PrimitivePalette = typeof primitives;
export type SemanticTokens = typeof semantics.light;
