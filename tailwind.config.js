/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          light: '#ffffff',
          dark: '#111318',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'float-idle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'robot-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-12px) scale(1.05)' },
          '60%': { transform: 'translateY(-4px) scale(0.98)' },
        },
        'slide-up-fade': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '70%': { transform: 'scale(1.04)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        blink: {
          '0%, 92%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        confetti: {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateY(48px) rotate(180deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'float-idle': 'float-idle 3.2s ease-in-out infinite',
        'robot-bounce': 'robot-bounce 0.9s ease-in-out',
        'slide-up-fade': 'slide-up-fade 0.35s ease-out both',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        blink: 'blink 4s infinite',
        confetti: 'confetti 1s ease-in forwards',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
