import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Fond principal — quasi noir
        background: '#0A0A0F',
        // Surface des cartes
        surface: '#111118',
        // Bordures subtiles
        border: '#1E1E2E',
        // Accent principal : cyan
        primary: {
          DEFAULT: '#00D4FF',
          hover: '#00BBDF',
          muted: '#00D4FF1A', // 10% opacity
        },
        // Accent secondaire : vert émeraude
        secondary: {
          DEFAULT: '#10B981',
          hover: '#0EA674',
          muted: '#10B9811A',
        },
        // Textes
        foreground: {
          DEFAULT: '#FFFFFF',
          muted: '#94A3B8',
          subtle: '#475569',
        },
        // Statuts
        status: {
          delivered: '#10B981',
          sent: '#00D4FF',
          pending: '#F59E0B',
          failed: '#EF4444',
        },
        // Couleurs sémantiques
        danger: '#EF4444',
        warning: '#F59E0B',
        success: '#10B981',
        info: '#00D4FF',
      },
      fontFamily: {
        // Titres
        syne: ['var(--font-syne)', 'sans-serif'],
        // Corps de texte
        sans: ['var(--font-dm-sans)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)',
        'gradient-dark': 'linear-gradient(180deg, #111118 0%, #0A0A0F 100%)',
        'gradient-glow': 'radial-gradient(circle at 50% 0%, #00D4FF15 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-secondary': '0 0 20px rgba(16, 185, 129, 0.15)',
        card: '0 1px 3px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
