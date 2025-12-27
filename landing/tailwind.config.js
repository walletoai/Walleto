/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        leather: {
          900: '#1a120b',
          800: '#2c1e12',
          700: '#3e2b1c',
          600: '#5d4037',
          accent: '#d4a373',
          dim: '#8b5e3c',
        }
      },
      backgroundImage: {
        'gradient-gold': 'linear-gradient(135deg, #d4a373 0%, #8b5e3c 100%)',
        'gradient-leather': 'linear-gradient(to bottom right, #2c1e12, #1a120b)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      }
    }
  },
  plugins: [],
}
