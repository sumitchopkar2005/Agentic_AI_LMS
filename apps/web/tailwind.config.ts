import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tokyo Night–inspired dark palette
        surface: {
          DEFAULT: '#0f0f1a',
          raised: '#1a1b2e',
          overlay: '#1e1f35',
          border: '#2a2b4d',
          'border-subtle': '#1e1f35',
        },
        text: {
          primary: '#e0e0f0',
          secondary: '#a9b1d6',
          muted: '#7a7b9d',
          faint: '#5a5b7d',
          inverted: '#0f0f1a',
        },
        accent: {
          blue: '#7aa2f7',
          purple: '#bb9af7',
          green: '#9ece6a',
          cyan: '#7dcfff',
          orange: '#ff9e64',
          red: '#f7768e',
          pink: '#ff007c',
        },
        brand: {
          50: '#eef2ff',
          100: '#dce4fd',
          200: '#b9c9fb',
          300: '#93adf9',
          400: '#7aa2f7',
          500: '#5a7de8',
          600: '#4563c7',
          700: '#3449a8',
          800: '#263489',
          900: '#1a2566',
        },
        gold: {
          DEFAULT: '#ff9e64',
          light: '#ffbd7a',
          dark: '#e8884e',
        },
        xp: {
          DEFAULT: '#bb9af7',
          light: '#d0b4f7',
          dark: '#9d7ce0',
        },
        streak: {
          DEFAULT: '#f7768e',
          light: '#ffa0b2',
          dark: '#e05672',
        },
        success: '#9ece6a',
        warning: '#ff9e64',
        danger: '#f7768e',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #7aa2f7, #bb9af7)',
        'gradient-gold': 'linear-gradient(135deg, #ff9e64, #ffbd7a)',
        'gradient-xp': 'linear-gradient(135deg, #bb9af7, #7dcfff)',
        'gradient-streak': 'linear-gradient(135deg, #f7768e, #ff9e64)',
        'gradient-success': 'linear-gradient(135deg, #9ece6a, #7aa2f7)',
        'gradient-surface': 'linear-gradient(135deg, #0a0a1a 0%, #1a1040 50%, #0a0a1a 100%)',
        'gradient-card': 'linear-gradient(135deg, #1a1f35 0%, #0f1729 100%)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'glow-xp': 'glow-xp 2s ease-in-out infinite alternate',
        'glow-gold': 'glow-gold 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-bar': 'pulse-bar 2s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'float-up': 'float-up 1.5s ease-out forwards',
        'confetti-fall': 'confetti-fall 2.5s ease-out forwards',
        'score-pop': 'score-pop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'flash-red': 'flash-red 0.4s ease-out',
        'flash-green': 'flash-green 0.6s ease-out',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'rank-shimmer': 'rank-shimmer 3s ease-in-out infinite',
        'slide-in-left': 'slide-in-left 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'typing-dot': 'typing-dot 1.4s infinite ease-in-out',
        'mascot-bob': 'mascot-bob 3s ease-in-out infinite',
        'mascot-bounce': 'mascot-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'bubble-appear': 'bubble-appear 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(122, 162, 247, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(122, 162, 247, 0.6)' },
        },
        'glow-xp': {
          '0%': { boxShadow: '0 0 5px rgba(187, 154, 247, 0.3)' },
          '100%': { boxShadow: '0 0 15px rgba(187, 154, 247, 0.6)' },
        },
        'glow-gold': {
          '0%': { boxShadow: '0 0 5px rgba(255, 158, 100, 0.3)' },
          '100%': { boxShadow: '0 0 15px rgba(255, 158, 100, 0.6)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-80px) scale(1.2)', opacity: '0' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(120px) rotate(720deg)', opacity: '0' },
        },
        'score-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.3)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'flash-red': {
          '0%': { boxShadow: '0 0 0 0 rgba(247, 118, 142, 0)' },
          '30%': { boxShadow: '0 0 30px 10px rgba(247, 118, 142, 0.3)' },
          '100%': { boxShadow: '0 0 0 0 rgba(247, 118, 142, 0)' },
        },
        'flash-green': {
          '0%': { boxShadow: '0 0 0 0 rgba(158, 206, 106, 0)' },
          '40%': { boxShadow: '0 0 40px 15px rgba(158, 206, 106, 0.4)' },
          '100%': { boxShadow: '0 0 0 0 rgba(158, 206, 106, 0)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0) rotate(-10deg)', opacity: '0' },
          '60%': { transform: 'scale(1.15) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(122, 162, 247, 0.2)' },
          '50%': { boxShadow: '0 0 24px rgba(122, 162, 247, 0.5)' },
        },
        'rank-shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'typing-dot': {
          '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' },
          '40%': { transform: 'scale(1)', opacity: '1' },
        },
        'mascot-bob': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'mascot-bounce': {
          '0%': { transform: 'scale(0.8) translateY(10px)', opacity: '0' },
          '60%': { transform: 'scale(1.1) translateY(-2px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        'bubble-appear': {
          '0%': { transform: 'translateY(8px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
