import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        nest: {
          bg: "var(--nest-bg)",
          surface: "var(--nest-surface)",
          text: "var(--nest-text)",
          muted: "var(--nest-muted)",
          border: "var(--nest-border)",
          primary: "var(--nest-primary)",
          secondary: "var(--nest-secondary)",
          hero: "var(--nest-hero)",
        },
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 24px rgba(61, 43, 34, 0.06)",
        "card-hover": "0 14px 32px rgba(61, 43, 34, 0.10)",
      },
      maxWidth: {
        nest: "1280px",
      },
    },
  },
  plugins: [],
};
export default config;
