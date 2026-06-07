import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#22C55E",
          hover: "#15803D",
        },
        secondary: "#86EFAC",
        accent: "#DCFCE7",
        background: "#F8FFF8",
        card: "#FFFFFF",
        text: "#0F172A",
        success: "#16A34A",
        muted: "#64748B",
        border: "#E2E8F0",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(34, 197, 94, 0.08)",
        card: "0 10px 30px -5px rgba(0, 0, 0, 0.03), 0 1px 3px 0 rgba(0, 0, 0, 0.02)",
        glass: "0 8px 32px 0 rgba(34, 197, 94, 0.05)",
      },
      borderRadius: {
        lg: "16px",
        md: "12px",
        sm: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
