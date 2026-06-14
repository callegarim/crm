import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Canvas & Surfaces ── */
        canvas: '#000000',
        card: '#1a1a1a',
        elevated: '#262626',
        soft: '#0d0d0d',
        carbon: '#2b2b2b',

        /* ── Hairlines & Borders ── */
        hairline: '#3c3c3c',
        'hairline-strong': '#262626',

        /* ── Text ── */
        ink: '#ffffff',
        body: '#bbbbbb',
        'body-strong': '#e6e6e6',
        muted: '#7e7e7e',

        /* ── Brand: M Tricolor ── */
        'm-blue': '#1c69d4',
        'm-blue-light': '#0066b1',
        'm-red': '#e22718',

        /* ── BMW Heritage ── */
        'bmw-blue': '#1c69d4',
        'electric-blue': '#0653b6',

        /* ── Semantic ── */
        warning: '#f4b400',
        success: '#0fa336',
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },

      fontSize: {
        /* Display hierarchy — BMW M design system */
        'display-xl': ['80px', { lineHeight: '1', fontWeight: '700', letterSpacing: '0' }],
        'display-lg': ['56px', { lineHeight: '1.05', fontWeight: '700', letterSpacing: '0' }],
        'display-md': ['40px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '0' }],
        'display-sm': ['32px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '0' }],
        'title-lg': ['24px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '0' }],
        'title-md': ['20px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0' }],
        'title-sm': ['18px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0' }],
        'label-uppercase': ['14px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '1.5px' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '300', letterSpacing: '0' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '300', letterSpacing: '0' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.5px' }],
        button: ['14px', { lineHeight: '1', fontWeight: '700', letterSpacing: '1.5px' }],
        'nav-link': ['14px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '0.5px' }],
      },

      letterSpacing: {
        machined: '1.5px',
        caption: '0.5px',
      },

      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '4px',
        md: '6px',
        full: '9999px',
      },

      spacing: {
        xxs: '4px',
        xs: '8px',
        sm: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
        xxl: '64px',
        section: '96px',
      },

      height: {
        'btn': '48px',
        'input': '48px',
        'topnav': '64px',
      },

      width: {
        'sidebar': '260px',
      },
    },
  },
  plugins: [],
};

export default config;
