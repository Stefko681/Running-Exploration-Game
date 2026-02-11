/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core app palette – dark / cyberpunk
        app: {
          bg: "#020617", // slate-950-ish
          surface: "#020617",
          surfaceSoft: "#020617ee",
          border: "#0f172a",
          accent: "#22d3ee", // cyan-400
          accentSoft: "#22d3ee26",
          accentAlt: "#a855f7", // violet-500
          danger: "#fb7185", // rose-400
          success: "#4ade80" // green-400
        }
      },
      boxShadow: {
        glow: "0 0 24px rgba(34, 211, 238, 0.22)"
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.4rem"
      }
    }
  },
  plugins: []
};


