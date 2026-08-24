import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1F2A44",
        gold: "#B08D57",
        border: "#E5E7EB",
        muted: "#6B7280",
      },
    },
  },
  plugins: [],
};

export default config;
