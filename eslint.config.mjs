import nextVitals from "eslint-config-next/core-web-vitals";

const config = [...nextVitals];
const nextConfig = config.find((c) => c.name === "next");
if (nextConfig?.rules) {
  nextConfig.rules["react-hooks/set-state-in-effect"] = "warn";
}

export default config;
