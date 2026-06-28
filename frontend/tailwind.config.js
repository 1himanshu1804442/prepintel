/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0B0F",
        glassCard: "rgba(17, 17, 24, 0.7)",
        neonGlow: "#6366F1",
        neonGreen: "#10B981",
        borderGlass: "rgba(255, 255, 255, 0.08)"
      }
    },
  },
  plugins: [],
}
