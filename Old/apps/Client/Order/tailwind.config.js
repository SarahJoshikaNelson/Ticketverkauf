/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--primary-color) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary-color) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--text-color) / <alpha-value>)',
        },
        background: {
          DEFAULT: 'rgb(var(--background-color) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent-color) / <alpha-value>)',
        },
      },
      borderRadius: {
        meins: 'var(--border-radius)',
      },
    },
  },
  plugins: [],
}; 