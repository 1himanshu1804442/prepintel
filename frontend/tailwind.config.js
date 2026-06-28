/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          900: '#0C0D11',
          800: '#12131A',
          700: '#1A1B24',
          600: '#22232E',
          500: '#2A2B38',
        },
        accent: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dim: 'rgba(108, 92, 231, 0.15)',
        },
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#E17055',
        info: '#74B9FF',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
