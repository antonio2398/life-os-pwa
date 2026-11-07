import type { Config } from "tailwindcss";

// Identidad Shark Life — ver branding/README.md
// ocean: neutros azul profundo (fondos, superficies, bordes, texto secundario)
// brand: aqua de la aleta (acciones, estados activos, acentos)
// gold:  solo para logros y celebraciones
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        ocean: {
          50:  "#F2F7FA",
          100: "#E3EDF3",
          200: "#C9DAE6",
          300: "#B4C8D6",
          400: "#8DA7BA",
          500: "#6F8BA4",
          600: "#46627A",
          700: "#2C465C",
          800: "#1A3045",
          900: "#0F2133",
          950: "#081523",
        },
        brand: {
          50:  "#E9FBFC",
          100: "#C8F4F7",
          200: "#96E9EF",
          300: "#5DDAE4",
          400: "#2CC7D5",
          500: "#12AFC0",
          600: "#0B7F8F",
          700: "#0A6773",
          800: "#0B535D",
          900: "#0C454E",
          950: "#052B32",
        },
        gold: {
          300: "#F2D28A",
          400: "#E8B84A",
          500: "#D49B22",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
