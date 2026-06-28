/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"TASA Orbiter"', 'sans-serif'],
      },
      colors: {
        sidebar: {
          bg: '#F5F5F5',
          hover: '#EAEAEA',
          active: '#E2E2E2',
          text: '#4A4A4A',
          icon: '#8A8A8A'
        }
      }
    },
  },
  plugins: [],
}
