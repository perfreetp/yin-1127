/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        audit: {
          navy: '#1e3a5f',
          'navy-light': '#2d4f7c',
          'navy-dark': '#162a47',
          green: '#2d5a3d',
          'green-light': '#3d7a52',
          red: '#c44536',
          'red-light': '#d66b5f',
          amber: '#d4a017',
          paper: '#faf8f5',
          'paper-dark': '#f0ece4',
          ink: '#1a1a1a',
          'ink-light': '#4a5568',
          border: '#d4cfc5',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'audit': '0 1px 3px rgba(30, 58, 95, 0.08), 0 1px 2px rgba(30, 58, 95, 0.06)',
        'audit-hover': '0 4px 12px rgba(30, 58, 95, 0.12), 0 2px 4px rgba(30, 58, 95, 0.08)',
        'audit-raised': '0 8px 24px rgba(30, 58, 95, 0.16)',
      },
      backgroundImage: {
        'paper-texture': 'radial-gradient(ellipse at top, #faf8f5 0%, #f5f2ec 100%)',
        'scan-line': 'linear-gradient(180deg, transparent 0%, rgba(46, 125, 255, 0.25) 50%, transparent 100%)',
      },
      animation: {
        'scan': 'scan 2s linear infinite',
        'blink': 'blink 1.2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
