/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  // Safelist dynamic color classes used in runtime string interpolation
  safelist: [
    { pattern: /bg-(indigo|violet|sky|amber|teal|purple|emerald|rose|zinc)-(400|500|600|700|800|900|950)\/(5|10|15|20|30)/ },
    { pattern: /border-(indigo|violet|sky|amber|teal|purple|emerald|rose|zinc)-(400|500|600|700|800)\/(20|30|40|50|60)/ },
    { pattern: /text-(indigo|violet|sky|amber|teal|purple|emerald|rose|zinc)-(300|400|500|600)/ },
    { pattern: /ring-(indigo|violet|sky|amber|teal|purple|emerald|rose)-(400|500)\/(20|30)/ },
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
