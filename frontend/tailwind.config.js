/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0f1117',
          card: '#1a1d27',
          border: '#2a2d3a',
          hover: '#22263a',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f52d4',
        },
      },
    },
  },
  plugins: [],
}
