import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Genre and reaction classes are applied via template literals — must safelist
  safelist: [
    'genre-adventure',
    'genre-drama',
    'genre-comedy',
    'genre-romance',
    'genre-coming-of-age',
    'genre-documentary',
    'reaction',
    'reaction active',
  ],
  theme: {
    extend: {
      colors: {
        // ── Core Brand ──
        flame: {
          DEFAULT: '#F9761C',
          dark:    '#C95A0C',
          deep:    '#7C2D12',
          mid:     '#FBA05A',
          glow:    '#FFEAE0',
          warm:    '#FEE0CC',
        },
        // ── Vibrant Accents ──
        magenta: {
          DEFAULT: '#EC4799',
          dark:    '#C0277A',
          tint:    '#FDE4F0',
        },
        cobalt: {
          DEFAULT: '#3D84F6',
          dark:    '#2563D8',
          tint:    '#E3ECFE',
        },
        vivid: {
          green:      '#36C665',
          'green-tint': '#E3F7E7',
          red:        '#DF3736',
          'blush':    '#FBE1DF',
          amber:      '#FFCA28',
          'amber-tint': '#FFF8E1',
        },
        // ── Warm Neutrals ──
        ink: {
          DEFAULT: '#1C1917',
          mid:     '#44403C',
          soft:    '#78716C',
          faint:   '#A8A29E',
        },
        border:  '#E7E0D8',
        surface: '#F5F0EB',
        canvas:  '#FDFAF7',
        // ── Genre colours ──
        genre: {
          adventure: '#F9761C',
          drama:     '#EC4799',
          comedy:    '#FFCA28',
          romance:   '#DF3736',
          coming:    '#36C665',
          doc:       '#3D84F6',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '24px',
        full: '9999px',
      },
      boxShadow: {
        sm:    '0 1px 3px rgba(100,60,20,0.08), 0 1px 2px rgba(100,60,20,0.04)',
        md:    '0 4px 12px rgba(100,60,20,0.10), 0 2px 4px rgba(100,60,20,0.05)',
        lg:    '0 12px 32px rgba(100,60,20,0.12), 0 4px 8px rgba(100,60,20,0.06)',
        photo: '0 8px 24px rgba(100,60,20,0.18)',
      },
      backgroundImage: {
        'gradient-brand':    'linear-gradient(135deg, #F9761C, #EC4799)',
        'gradient-cinematic':'linear-gradient(160deg, #F9761C 0%, #EC4799 55%, #3D84F6 100%)',
        'gradient-green':    'linear-gradient(135deg, #3D84F6, #36C665)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}

export default config
