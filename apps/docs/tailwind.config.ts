import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Signature "ember" accent — warm amber → orange. Modules are the
        // "blades" you forge your backend from, so the palette leans warm.
        accent: {
          50: '#fff8ed',
          100: '#fef0d5',
          200: '#fddfa9',
          300: '#fbc873',
          400: '#f9ab3b',
          500: '#f5900f',
          600: '#e5760a',
          700: '#be590c',
          800: '#974710',
          900: '#7a3b11',
        },
        // Semantic tokens — driven by CSS variables so light/dark share markup.
        canvas: 'var(--bg)',
        surface: 'var(--surface)',
        subtle: 'var(--subtle)',
        ink: 'var(--fg)',
        muted: 'var(--fg-muted)',
        faint: 'var(--fg-faint)',
        line: 'var(--border)',
        'line-strong': 'var(--border-strong)',
        brand: 'var(--accent)',
        'brand-fg': 'var(--accent-contrast)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      maxWidth: {
        content: '46rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
      },
    },
  },
  plugins: [typography],
} satisfies Config
