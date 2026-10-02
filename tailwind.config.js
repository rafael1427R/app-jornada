/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0f4c81',
          hover: '#1a6bb5',
          dark: '#0b3a63',
          light: '#e8f0f7',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#00a99d',
          dark: '#008b81',
          light: '#e6f7f5',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        border: '#e2e8f0',
        surface: '#ffffff',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'none' } },
        'scale-in': { '0%': { opacity: 0, transform: 'scale(.97)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'scale-in': 'scale-in .16s ease-out',
      },
    },
  },
  plugins: [],
}
