/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        text: 'var(--text-color)',
        background: 'var(--background-color)',
        accent: 'var(--accent-color)',
      },
      borderRadius: {
        meins: 'var(--border-radius)',
      },
    },
  },
  plugins: [],
}

