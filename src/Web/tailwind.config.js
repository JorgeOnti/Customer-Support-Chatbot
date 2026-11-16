/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ember: {
          50: '#fff6f0',
          100: '#ffe9db',
          200: '#ffcfb6',
          300: '#ffad85',
          400: '#fd7f4b',
          500: '#f55d24',
          600: '#d94814',
          700: '#b53512',
          800: '#902b16',
          900: '#752716',
        },
        charcoal: {
          900: '#181412',
          800: '#241e1a',
          700: '#332a24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
};
