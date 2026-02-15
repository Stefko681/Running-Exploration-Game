/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /**
       * Dynamic Theme Tokens
       * Mapped to CSS variables in index.css for runtime switching (dark/light/contrast).
       */
      colors: {
        // Core app palette – dynamic themes
        app: {
          bg: "var(--app-bg)",
          surface: "var(--app-surface)",
          // Using rgba with css var for opacity support
          accent: "rgba(var(--app-accent-rgb), <alpha-value>)",
          accentSoft: "rgba(var(--app-accent-rgb), 0.15)",

          surfaceSoft: "#020617ee", // kept static for now or can start migrating
          border: "#0f172a",
          accentAlt: "#a855f7", // violet-500
          danger: "#fb7185", // rose-400
          success: "#4ade80" // green-400
        }
      },
      boxShadow: {
        glow: "0 0 24px rgba(var(--app-accent-rgb), 0.22)"
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.4rem"
      }
    }
  },
  plugins: []
};


