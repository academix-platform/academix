import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        /* =========================================================================
         * Legacy Academix Tokens (100% Backward Compatibility)
         * ========================================================================= */
        academixInk: "#24104F",
        academixInkMuted: "#3B1B76",
        academixSurface: "#F7F3FF",
        academixPanel: "#FFFFFF",
        academixBorder: "#E9DDFD",

        academixSky: "#C3EBFA",
        academixSkyLight: "#EDF9FD",

        academixPurple: "#CFCEFF",
        academixPurpleLight: "#F1F0FF",

        academixPurpleDark: "#7C3AED",
        academixPurpleDeep: "#24104F",
        academixPurpleMuted: "#3B1B76",

        academixYellow: "#FCD34D",
        academixYellowLight: "#FEFCE8",

        /* =========================================================================
         * New Systematic Primitive Scales
         * ========================================================================= */
        brandPurple: {
          50: "#FAF7FD",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#CFCEFF",
          400: "#A855F7",
          500: "#8B5CF6",
          600: "#7C3AED",
          700: "#6D28D9",
          800: "#5B21B6",
          900: "#3B1B76",
          950: "#24104F",
        },
        slateNeutral: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
          950: "#020617",
        },

        /* =========================================================================
         * Semantic Tokens (Dynamic CSS Variables)
         * ========================================================================= */
        canvas: {
          DEFAULT: "var(--color-canvas)",
          subtle: "var(--color-canvas-subtle)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-surface-muted)",
          elevated: "var(--color-surface-elevated)",
          sidebar: "var(--color-surface-sidebar)",
          "sidebar-hover": "var(--color-surface-sidebar-hover)",
        },
        content: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
          subtle: "var(--color-text-subtle)",
          inverse: "var(--color-text-inverse)",
          brand: "var(--color-text-brand)",
          "brand-dark": "var(--color-text-brand-dark)",
        },
        outline: {
          subtle: "var(--color-border-subtle)",
          DEFAULT: "var(--color-border-default)",
          strong: "var(--color-border-strong)",
          brand: "var(--color-border-brand)",
          focus: "var(--color-border-focus)",
        },
        primaryAction: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          active: "var(--color-primary-active)",
          subtle: "var(--color-primary-subtle)",
          fg: "var(--color-primary-foreground)",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-purple)",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": {
            transform: "rotate(-10deg)",
          },
          "50%": {
            transform: "rotate(10deg)",
          },
        },
      },
      animation: {
        wiggle: "wiggle 1s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "var(--font-sans)", "system-ui", "sans-serif"],
        cairo: ["var(--font-cairo)", "var(--font-arabic)", "sans-serif"],
        ibmArabic: ["var(--font-ibm-arabic)", "var(--font-arabic)", "sans-serif"],
        inter: ["var(--font-sans)", "system-ui", "sans-serif"],
        poppins: ["var(--font-poppins)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      fontSize: {
        display: ["var(--text-display-size)", { lineHeight: "var(--text-display-lh)" }],
        "title-1": ["var(--text-title-1-size)", { lineHeight: "var(--text-title-1-lh)" }],
        "title-2": ["var(--text-title-2-size)", { lineHeight: "var(--text-title-2-lh)" }],
        "title-3": ["var(--text-title-3-size)", { lineHeight: "var(--text-title-3-lh)" }],
        body: ["var(--text-body-size)", { lineHeight: "var(--text-body-lh)" }],
        "body-sm": ["var(--text-body-sm-size)", { lineHeight: "var(--text-body-sm-lh)" }],
        caption: ["var(--text-caption-size)", { lineHeight: "var(--text-caption-lh)" }],
        micro: ["var(--text-micro-size)", { lineHeight: "var(--text-micro-lh)" }],
      },
    },
  },
  plugins: [],
};
export default config;
