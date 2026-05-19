export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: '#080808',
        surface: '#111111',
        border: '#1c1c1c',
        alive: '#c8ff00',
        warn: '#ff9500',
        dead: '#ff3b30',
        muted: '#555555',
        text: '#e8e8e8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bebas Neue', 'sans-serif'],
      }
    },
  },
  plugins: [],
}