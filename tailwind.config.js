/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  safelist: [
    'bg-sky-500/20',
    'bg-sky-500/10',
    'bg-sky-500/80',
    'bg-emerald-500/90',
    'bg-rose-500/90',
    'bg-amber-300/90',
    'bg-cyan-400/90',
    'bg-slate-900/60',
    'bg-slate-900/70',
    'bg-white/80',
    'border-sky-400/60',
    'border-white/10',
    'border-white/5',
    'border-slate-600/40',
    'border-emerald-500/40',
    'border-rose-500/40',
    'border-amber-400/40',
    'border-slate-200/40',
    'border-slate-900/60',
    'border-sky-500/40',
    'border-cyan-400/40',
    'text-sky-100',
    'text-sky-200',
    'text-slate-200',
    'text-slate-300',
    'text-slate-400',
    'text-slate-100',
    'text-emerald-100',
    'text-rose-100',
    'text-amber-100',
    'text-slate-900',
    'shadow-sky-900/20',
    'shadow-sky-900/30',
    'shadow-sky-900/40',
    'shadow-emerald-500/40',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Nunito', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        kid: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        kid: {
          bg:      '#FFFBF0',
          surface: '#FFFFFF',
          blue:    '#4A9EF5',
          gold:    '#FFD93D',
          green:   '#6BCB77',
          red:     '#FF6B6B',
          text:    '#2D3748',
          muted:   '#718096',
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': {
            display: 'none'
          }
        }
      })
    }
  ],
}

