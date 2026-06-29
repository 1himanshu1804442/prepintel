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
          900: '#F9F9F6', // Off-white cream background
          800: '#FFFFFF', // Pure white panels
          700: '#E5E5E5', // Light borders
          600: '#CCCCCC', // Darker borders/dividers
          500: '#999999', // Muted text
        },
        accent: {
          DEFAULT: '#000000',
          light: '#333333',
          dim: 'rgba(0, 0, 0, 0.05)',
        },
        success: '#027A48', // Stark green
        warning: '#B54708', // Stark orange
        danger: '#B42318',  // Stark red
        info: '#026AA2',
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
