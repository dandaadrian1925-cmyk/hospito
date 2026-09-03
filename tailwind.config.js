/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#F3FBF9', 100: '#E2F5F2', 200: '#C5EAE4', 300: '#9FDDD3', 400: '#72CCBE', 500: '#4CBFAD', 600: '#2FB4A0', 700: '#227978', 800: '#174858', 900: '#123642', 950: '#0D2830' },
        maket: { blue: '#2FB4A0', dark: '#174858', light: '#E2F5F2', accent: '#F59E0B' }
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
