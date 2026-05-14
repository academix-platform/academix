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
        academixSky: "#C3EBFA",
        academixSkyLight: "#EDF9FD",

        academixPurple: "#CFCEFF",
        academixPurpleLight: "#F1F0FF",

        academixPurpleDark: "#7C3AED",

        academixYellow: "#FAE27C",
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
