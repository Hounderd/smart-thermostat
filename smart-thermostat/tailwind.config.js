/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#18181b", // Dark Zinc
        card: "#27272a",
        neonBlue: "#3b82f6",
        neonOrange: "#f97316",
        neonGreen: "#22c55e",
      },
      fontFamily: {
        mono: ['"Fira Code"', 'monospace'],
      }
    },
  },
  plugins: [],
}
