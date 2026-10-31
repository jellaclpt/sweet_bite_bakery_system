/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Sweet Bite brand palette, shared by the admin and customer sides
      colors: {
        brand: {
          DEFAULT: "#974D07", // primary buttons, links, prices
          hover: "#7C3F06",
          cocoa: "#6B3E26", // admin sidebar
          latte: "#9C6B46", // light brown hover pill on the sidebar (white text stays readable)
          deep: "#5A381E", // headings
        },
        cream: "#FFF8F0", // page background
        sand: "#F0E6DD", // soft fills, avatars
        line: "#E8DDD2", // borders and dividers
      },
      keyframes: {
        "dropdown-in": {
          from: { opacity: "0", transform: "translateY(-4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "dropdown-in": "dropdown-in 120ms ease-out",
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
