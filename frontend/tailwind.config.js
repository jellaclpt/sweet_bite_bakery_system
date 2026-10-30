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
          deep: "#5A381E", // headings
        },
        cream: "#FFF8F0", // page background
        sand: "#F0E6DD", // soft fills, avatars
        line: "#E8DDD2", // borders and dividers
      },
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
}
