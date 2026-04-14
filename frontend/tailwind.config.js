/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Outfit', 'sans-serif'],
      display: ['Manrope', 'sans-serif'],
    },
    extend: {
      fontSize: {
        'small': '0.75rem',  // 12px
        'body': '1rem',      // 16px
        'h5': '1.333rem',    // 21.33px
        'h4': '1.777rem',    // 28.43px
        'h3': '2.369rem',    // 37.90px
        'h2': '3.157rem',    // 50.52px
        'h1': '4.209rem',    // 67.34px
      },
      colors: {
        // Core Brand Colors Refined
        'dark-blue': '#090638',
        'dark-blue-deep': '#060424',
        'dark-blue-light': '#1A1558',
        'accent-yellow': '#FBD213',
        'head-text': '#090638',
        'body-text': '#64748B', // Softer, more modern slate
        'light-color': '#F8FAFC', // Crisp background accent
        
        // Extended States
        'navy-hover': '#130E4D',
        'blue-faded': '#8B8BA7',
        'yellow-default': '#FFB84D',
        'yellow-faded': '#FFD699',
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px -2px rgba(251, 210, 19, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
