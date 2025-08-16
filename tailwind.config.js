/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        'franklin': ['Franklin Gothic ATF', 'sans-serif'],
        'larabie': ['Fira Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
