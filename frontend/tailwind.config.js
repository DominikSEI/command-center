/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--bg-surface))',
          card:    'rgb(var(--bg-card))',
          raised:  'rgb(var(--bg-raised))',
          border:  'rgb(var(--bg-border))',
          hover:   'rgb(var(--bg-hover))',
        },
        accent: {
          DEFAULT: '#8b5cf6',
          hover:   '#7c3aed',
          blue:    '#3b82f6',
          glow:    'rgba(139,92,246,0.18)',
        },
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)',
        'gradient-card':   'linear-gradient(160deg, rgba(139,92,246,0.06) 0%, rgba(59,130,246,0.03) 100%)',
      },
      boxShadow: {
        'glow':    '0 0 24px rgba(139,92,246,0.18)',
        'glow-sm': '0 0 12px rgba(139,92,246,0.12)',
        'card':    '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
