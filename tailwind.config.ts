import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#060e08',
        surface: '#101f14',
        'surface-2': '#070d09',
        border: '#1b3820',
        gold: '#d4a017',
        'gold-2': '#f0bb28',
        cream: '#ede8d5',
        muted: '#6a9070',
        'spain-red': '#c60b1e',
        'spain-yellow': '#f1bf00',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
