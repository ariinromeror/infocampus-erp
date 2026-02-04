/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/views/**/*.{js,ts,jsx,tsx}", // Esto es vital para tus carpetas de student y auth
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}