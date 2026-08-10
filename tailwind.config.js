/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    'bg-orange-500', 'bg-red-500', 'bg-pink-500', 'bg-teal-500', 'bg-yellow-500', 'bg-green-500',
    'text-orange-500', 'text-red-500', 'text-pink-500', 'text-teal-500', 'text-yellow-500', 'text-green-500',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"TASA Orbiter"', 'sans-serif'],
        mono: ['"Inconsolata"', 'monospace'],
      },
      fontWeight: {
        regular: '400',
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
