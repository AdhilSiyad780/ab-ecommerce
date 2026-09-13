/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F5F7EF",
        surface: "#FFFFFF",
        ink: "#1B2420",
        muted: "#66705F",
        line: "#DFE6D6",
        green: {
          900: "#173C24",
          700: "#1E5631",
          500: "#3E7D40",
          300: "#8FBF7F",
          100: "#E4F0DA",
        },
        gold: { DEFAULT: "#E8A33D", dark: "#B9781E" },
        red: "#C1462B",
      },
      fontFamily: {
        display: ["Fraunces", "serif"],
        body: ["Work Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
