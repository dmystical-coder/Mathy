/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#e0e5ec", // Classic Neumorphic Light-ish Grey or Dark
        // Let's stick to the requested "Dark" minimalist but skeuomorphic.
        // Actually, Dark Skeuomorphism (Neumorphism) is usually dark grey.
        'neu-base': '#2d2d2d',
        'neu-dark': '#252525',
        'neu-light': '#353535',
        primary: "#3b82f6",
        text: "#ededed",
      },
      boxShadow: {
        'neu-out': '8px 8px 16px #1a1a1a, -8px -8px 16px #404040',
        'neu-in': 'inset 8px 8px 16px #1a1a1a, inset -8px -8px 16px #404040',
        'neu-out-sm': '4px 4px 8px #1a1a1a, -4px -4px 8px #404040',
        'neu-pressed': 'inset 4px 4px 8px #1a1a1a, inset -4px -4px 8px #404040',
      },
      animation: {
        'bounce-slow': 'bounce 3s infinite',
      }
    },
  },
  plugins: [],
}
