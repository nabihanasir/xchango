/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Roboto', 'sans-serif'],
    },
    extend: {
      fontSize: {
        'small': '0.75rem',  // 12px
        'body': '1rem',      // 16px (Base/P)
        'h5': '1.333rem',    // 21.33px
        'h4': '1.777rem',    // 28.43px
        'h3': '2.369rem',    // 37.90px
        'h2': '3.157rem',    // 50.52px
        'h1': '4.209rem',    // 67.34px
      },
      colors: {
        'dark-blue': '#090638',
        'accent-yellow': '#FBD213',
        'head-text': '#090638',
        'body-text': '#6B6B6B',
        'light-color': '#EDEDED',
        
        // Button specific active/hover states
        'navy-hover': '#000080',
        'blue-faded': '#7F7F9B',
        'yellow-default': '#FFB84D',
        'yellow-faded': '#FFD699',
      }
    },
  },
  plugins: [],
}
