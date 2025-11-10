/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'raid-neon': '#00ff88', // Custom green for accents
        'wipe-red': '#ff4444', // For meme "wipe" highlights
      },
    },
  },
  plugins: [],
}