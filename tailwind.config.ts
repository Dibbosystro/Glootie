import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        "ink-2": "#1c1e21",
        "meta-blue": "#0866ff",
        "morse-mint": "#00d4aa",
        "morse-coral": "#ff4d6d",
        "morse-amber": "#f59e0b",
        "paper-warm": "#faf9f5"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
