/** @type {import('tailwindcss').Config} */
export default {
  content: ["./renderer/index.html", "./renderer/src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff4ff",
          100: "#dbe6fe",
          200: "#bfd3fe",
          300: "#93b4fd",
          400: "#608afa",
          500: "#3e63dd",
          600: "#2f4fc7",
          700: "#2a43a3",
          800: "#273a82",
          900: "#243466",
          950: "#1a2344",
        },
        ink: {
          50: "#f7f8fa",
          100: "#eceff4",
          200: "#dfe4ec",
          300: "#c3cbd7",
          400: "#8c97a8",
          500: "#5b6577",
          600: "#404958",
          700: "#2e3442",
          800: "#1f242f",
          900: "#141820",
          950: "#0b0e14",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        drawer: "-16px 0 40px rgba(15,22,36,0.12)",
      },
    },
  },
  plugins: [],
};
