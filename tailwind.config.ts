import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
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
    },
  },
  plugins: [],
};
export default config;
