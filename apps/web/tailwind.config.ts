import type { Config } from 'tailwindcss'

const config: Config = {
  // Batch 3 (APSpace-inspired personalization): light/dark theme toggle.
  // 'class' strategy — dark mode is driven by a `dark` class on <html>
  // (see components/ThemeInit.tsx), not the OS-level prefers-color-scheme,
  // so it can be a per-user preference stored in `users.theme`.
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Full 50–900 ramps (not just the 2-3 shades the app started with) so
        // shared components can express hover/active/tint states without
        // reaching for arbitrary hex values page by page.
        brand: {
          blue:        '#1B3D8C',
          'blue-50':   '#F1F5FD',
          'blue-100':  '#EFF6FF',
          'blue-200':  '#C7D6F5',
          'blue-400':  '#4C6FD1',
          'blue-600':  '#2E5FCC',
          'blue-700':  '#15316E',
          red:         '#DC2626',
          'red-50':    '#FEF5F5',
          'red-100':   '#FEF2F2',
          gold:        '#F59E0B',
          'gold-50':   '#FFFCF3',
          'gold-100':  '#FFFBEB',
          black:       '#0F172A',
        },
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
      // Softer, more layered elevation than Tailwind's defaults — used by
      // .card and the portal sidebar so surfaces read as "lifted" without
      // the harsh default shadow-md/lg look.
      boxShadow: {
        soft: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        lifted: '0 4px 6px -2px rgb(15 23 42 / 0.05), 0 10px 20px -4px rgb(15 23 42 / 0.08)',
        nav: '1px 0 0 0 rgb(15 23 42 / 0.06)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}

export default config
