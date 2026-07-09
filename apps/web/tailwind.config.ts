import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/shared/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#1B3D8C',
          'blue-600':  '#2E5FCC',
          'blue-100':  '#EFF6FF',
          red:         '#DC2626',
          'red-100':   '#FEF2F2',
          gold:        '#F59E0B',
          'gold-100':  '#FFFBEB',
          black:       '#0F172A',
        },
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
