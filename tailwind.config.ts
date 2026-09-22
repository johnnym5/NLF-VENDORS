import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        heading: ['var(--font-plus-jakarta)'],
        mono: ['var(--font-jetbrains)'],
      },
      colors: {
        canvas: '#FBFBFA',
        sage: { bg: '#F2F7F4', border: '#B8D8C5', badge: '#D8EADF', text: '#1E4D38' },
        champagne: { bg: '#FAF6EC', border: '#E8D7B0', badge: '#FEF3D6', text: '#8D6B1B' },
        'slate-tier': { bg: '#F3F4F6', border: '#D1D5DB', badge: '#E5E7EB', text: '#1F2937' },
        'status-active': { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
        'status-revoked': { bg: '#FEE2E2', border: '#FCA5A5', text: '#991B1B' },
        'status-warning': { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 600ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
export default config;
