import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1917",
        "ink-2": "#44403c",
        sidebar: "#1c1917",
        "sidebar-line": "#292524",
        accent: {
          DEFAULT: "#b45309",
          strong: "#92400e",
          soft: "#fef3c7",
          tint: "#fffbeb",
          300: "#fcd34d",
          400: "#fbbf24"
        },
        "meta-blue": "#0866ff"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular"]
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(28, 25, 23, 0.04)",
        card: "0 1px 2px rgba(28, 25, 23, 0.04), 0 12px 24px rgba(28, 25, 23, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
