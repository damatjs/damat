import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        // Always-dark code panel chrome.
        'code-panel': 'var(--code-bg)',
        'code-panel-surface': 'var(--code-surface)',
        'code-panel-line': 'var(--code-border)',
        'code-panel-faint': 'var(--code-faint)',
      },
      fontFamily: {
        sans: [
          'var(--font-sans)',
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
          'var(--font-mono)',
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
      fontSize: {
        '2xs': ['0.72rem', { lineHeight: '1.4' }],
        code: ['0.8rem', { lineHeight: '1.65' }],
        md: ['0.95rem', { lineHeight: '1.6' }],
      },
      maxWidth: {
        content: '46rem',
        shell: '90rem',
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
