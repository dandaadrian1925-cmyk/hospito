/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EEF3FD', 100: '#DCE7FC', 200: '#B9CFF8', 300: '#8DAEF2', 400: '#5C87E8', 500: '#3563D6', 600: '#2451C4', 700: '#1D40A0', 800: '#17337D', 900: '#142B66', 950: '#0D1B40' },
        maket: { blue: '#2451C4', dark: '#17337D', light: '#EAF0FD', accent: '#F59E0B' }
      },
      fontFamily: { sans: ['Inter', 'sans-serif'], display: ['Fraunces', 'serif'] },
      animation: {
        'scroll': 'scroll 30s linear infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
        'slide-in': 'slideIn 0.5s ease forwards',
      },
      keyframes: {
        scroll: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        slideIn: { '0%': { opacity: 0, transform: 'translateX(-20px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
      }
    },
  },
  plugins: [],
}
