/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#F24444', // Matching the vibrant red in the screenshot
        'brand-red-hover': '#e53935',
        'primary': '#F24444',
        'primary-hover': '#e53935',
      },
      borderRadius: {
        'lg': '6px',
        'xl': '12px',
        '2xl': '16px',
      }
    },
  },
  plugins: [],
}
