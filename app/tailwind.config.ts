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
        sunrise: {
          DEFAULT: '#FF5C1A',
          dark:    '#B53C00',
          mid:     '#FF8A4C',
          glow:    '#FFF0E8',
          warm:    '#FFD4B8',
        },
        golden: {
          DEFAULT: '#FFAA00',
          dark:    '#B57500',
          mid:     '#FFCC44',
          glow:    '#FFF5D6',
        },
        blossom: {
          DEFAULT: '#FF2D78',
          dark:    '#B5005A',
          mid:     '#FF6FA0',
          glow:    '#FFE8F0',
        },
        sky: {
          DEFAULT: '#2E90FA',
          dark:    '#1A6BC4',
          glow:    '#E8F4FF',
        },
        sage: {
          DEFAULT: '#12B76A',
          dark:    '#0D7A3B',
          glow:    '#E8FAF0',
        },
        dusk: {
          DEFAULT: '#8B5CF6',
          dark:    '#5B2DC0',
          glow:    '#F0EAFF',
        },
        // ── Warm Neutrals ──
        ink: {
          DEFAULT: '#1C1917',
          mid:     '#44403C',
          soft:    '#78716C',
          faint:   '#A8A29E',
        },
        border:  '#D4CCC4',
        surface: '#F5F0EA',
        canvas:  '#FFFBF5',
        // ── Genre colours ──
        genre: {
          adventure: '#FF5C1A',
          drama:     '#FF2D78',
          comedy:    '#FFAA00',
          romance:   '#8B5CF6',
          coming:    '#12B76A',
          doc:       '#2E90FA',
        },
        // ── Legacy aliases (keep for any hardcoded refs) ──
        flame: {
          DEFAULT: '#FF5C1A',
          dark:    '#B53C00',
          deep:    '#7C2D12',
          mid:     '#FF8A4C',
          glow:    '#FFF0E8',
          warm:    '#FFD4B8',
        },
        magenta: {
          DEFAULT: '#FF2D78',
          dark:    '#B5005A',
          tint:    '#FFE8F0',
        },
        cobalt: {
          DEFAULT: '#2E90FA',
          dark:    '#1A6BC4',
          tint:    '#E8F4FF',
        },
        vivid: {
          green:        '#12B76A',
          'green-tint': '#E8FAF0',
          red:          '#DF3736',
          blush:        '#FBE1DF',
          amber:        '#FFAA00',
          'amber-tint': '#FFF5D6',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        // Plastic toy: sharp corners everywhere
        sm:   '0px',
        md:   '0px',
        lg:   '0px',
        xl:   '0px',
        full: '9999px',   // kept only for circular avatars / explicit pills
      },
      boxShadow: {
        // 3D plastic offset shadows — hard, no blur
        sm:      '2px 2px 0 #1C1917',
        md:      '3px 3px 0 #1C1917',
        lg:      '4px 4px 0 #1C1917',
        photo:   '4px 4px 0 rgba(0,0,0,0.40)',
        // Button bottom-drop variants (apply via arbitrary value in JSX or component class)
        sunrise: '0 4px 0 #B53C00',
        golden:  '0 4px 0 #B57500',
        blossom: '0 4px 0 #B5005A',
        sky:     '0 4px 0 #1A6BC4',
        sage:    '0 4px 0 #0D7A3B',
        dusk:    '0 4px 0 #5B2DC0',
        dark:    '0 4px 0 #000000',
      },
      backgroundImage: {
        'gradient-brand':  'linear-gradient(135deg, #FF5C1A, #FF2D78)',
        'gradient-sunny':  'linear-gradient(135deg, #FF5C1A, #FFAA00)',
        'gradient-sky':    'linear-gradient(135deg, #2E90FA, #8B5CF6)',
        'gradient-cinematic': 'linear-gradient(160deg, #FF5C1A 0%, #FF2D78 55%, #8B5CF6 100%)',
        'gradient-green':  'linear-gradient(135deg, #2E90FA, #12B76A)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}

export default config
