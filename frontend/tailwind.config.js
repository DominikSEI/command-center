/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#F4EFE6',   // warm beige/cream background
          card:    '#FFFFFF',   // white cards
          raised:  '#FAF8F4',   // slightly elevated (input backgrounds)
          border:  '#E5DDD0',   // warm border
          hover:   '#EDE7DB',   // hover state
        },
        accent: {
          DEFAULT: '#E8630A',   // warm orange
          hover:   '#C85509',
          light:   '#FEF0E6',   // soft orange tint (badge backgrounds)
        },
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #E8630A 0%, #F59E0B 100%)',
        'gradient-warm':   'linear-gradient(135deg, #FAF8F4 0%, #F4EFE6 100%)',
      },
      boxShadow: {
        'card':    '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        'card-md': '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        'glow':    '0 0 20px rgba(232,99,10,0.15)',
        'glow-sm': '0 0 10px rgba(232,99,10,0.10)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
