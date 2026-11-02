/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:        '#1B365D',
          'navy-light':'#2A4A7A',
          'navy-dark': '#122440',
          slate:       '#263449',
          ivory:       '#F7F5EF',
          'soft-blue': '#DCECF5',
          teal:        '#B9D9CE',
          amber:       '#E8B85B',
          lavender:    '#E8DDF7',
          peach:       '#F8DFD1',
          yellow:      '#F8E9B7',
          mint:        '#C8EDE4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        devanagari: ['"Noto Sans Devanagari"', 'sans-serif'],
      },
      boxShadow: {
        card:       '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover':'0 10px 25px -3px rgb(0 0 0 / 0.10), 0 4px 6px -4px rgb(0 0 0 / 0.08)',
        'glow-navy': '0 0 0 3px rgb(27 54 93 / 0.15)',
      },
      backgroundImage: {
        'grad-hero':     'linear-gradient(135deg, #1B365D 0%, #263449 60%, #2A4A7A 100%)',
        'grad-blue-lav': 'linear-gradient(135deg, #DCECF5 0%, #E8DDF7 100%)',
        'grad-mint-blue':'linear-gradient(135deg, #C8EDE4 0%, #DCECF5 100%)',
        'grad-peach-yel':'linear-gradient(135deg, #F8DFD1 0%, #F8E9B7 100%)',
        'grad-navy-blue':'linear-gradient(135deg, #1B365D 0%, #2A4A7A 100%)',
        'grad-teal-mint':'linear-gradient(135deg, #B9D9CE 0%, #C8EDE4 100%)',
      },
      animation: {
        'float-slow':  'floatSlow 6s ease-in-out infinite',
        'float-med':   'floatMed 4s ease-in-out infinite',
        'pulse-soft':  'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%,100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':     { transform: 'translateY(-12px) rotate(3deg)' },
        },
        floatMed: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
