/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.html',
    './src/**/*.ts',
  ],
  theme: {
    extend: {
      colors: {
        'clinic-primary': 'var(--clinic-primary, #dca311)',
        'clinic-secondary': 'var(--clinic-secondary, #0b1120)',
      }
    }
  },
  plugins: [],
}
