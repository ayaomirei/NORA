import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const luxeSky = {
  50: '#f6f7fa',
  100: '#eceef4',
  200: '#d8dde8',
  300: '#b8c4d8',
  400: '#94a8c8',
  500: '#7a8eb8',
  600: '#6478a0',
  700: '#506078',
  800: '#424e60',
  900: '#384048',
  950: '#262c34',
} as const

const luxeAmber = {
  50: '#faf7f2',
  100: '#f4ede4',
  200: '#e8dcc8',
  300: '#dcc8a8',
  400: '#d0b490',
  500: '#b8a488',
  600: '#9c8868',
  700: '#807058',
  800: '#685c4c',
  900: '#564c40',
  950: '#322c26',
} as const

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sky: luxeSky,
        amber: luxeAmber,
        nora: {
          bg: '#1e1a2c',
          accent: '#a8b8d8',
          accent2: '#d8c0a0',
          border: 'rgba(255, 255, 255, 0.1)',
          glass: 'rgba(42, 40, 38, 0.72)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
      letterSpacing: {
        luxe: '0.06em',
      },
      boxShadow: {
        neon: '0 0 0 1px color-mix(in srgb, var(--nora-accent-2) 32%, transparent), 0 10px 32px -8px var(--nora-glow)',
        'neon-lg':
          '0 0 0 1px color-mix(in srgb, var(--nora-accent-2) 40%, transparent), 0 16px 48px -12px var(--nora-glow)',
        glass: 'var(--nora-shadow-glass)',
        'glass-lg': 'var(--nora-shadow-glass-lg)',
      },
      backdropBlur: {
        glass: '22px',
        'glass-lg': '32px',
      },
      borderRadius: {
        glass: 'var(--nora-radius)',
        'glass-lg': 'var(--nora-radius-lg)',
      },
      transitionDuration: {
        theme: '380ms',
        smooth: '280ms',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
        nora: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config
