/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Lettering printed on the felt (spot names, dealer side).
        felt: ['Marcellus', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        room: '#160d09', // walnut-dark room around the table
        felt: { DEFAULT: '#14503f', deep: '#0b3529', light: '#1f6a53' },
        rail: '#3b1712', // leather armrest
        brass: { DEFAULT: '#c9a24a', light: '#e6c878', dark: '#8a6a24' },
        ivory: '#f1e8d2',
        punto: '#3f7fc4', // player side
        banco: '#c2453d', // banker side
        jade: '#2f9a68', // tie
      },
    },
  },
  plugins: [],
}
