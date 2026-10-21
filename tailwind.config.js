/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#f6f3ed', deep: '#e9e4da' },
        ink: { DEFAULT: '#17283f', soft: '#536171', mute: '#647080' },
        tomato: { DEFAULT: '#b73529', dark: '#c82e22' },
        leaf: { DEFAULT: '#294563', light: '#e6e9ec' },
        butter: '#FFD84D',
      },
      fontFamily: {
        display: ['Arial', 'Helvetica', 'sans-serif'],
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
      keyframes: {
        pop: { '0%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.35)' }, '100%': { transform: 'scale(1)' } },
        rise: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { pop: 'pop .35s ease-out', rise: 'rise .4s ease-out both' },
    },
  },
  plugins: [],
};
