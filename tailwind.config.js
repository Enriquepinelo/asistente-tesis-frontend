/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14213D',
          800: '#1B2C4F',
          700: '#233A66',
          600: '#2E4A80',
        },
        paper: {
          DEFAULT: '#F4F6FA',
          100: '#FFFFFF',
          200: '#E9EDF4',
          300: '#DDE3EC',
        },
        gold: {
          DEFAULT: '#C98A2B',
          dark: '#A06E1F',
          light: '#E7B565',
        },
        ok: '#2F6F4E',
        warn: '#B7791F',
        danger: '#B3261E',
        slate: {
          DEFAULT: '#2B3346',
          soft: '#5B6577',
        },
      },
      fontFamily: {
        serif: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
