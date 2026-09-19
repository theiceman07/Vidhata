import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
  	extend: {
  		colors: {
  			brand: {
  				DEFAULT: '#875F45',
  				fg: '#FFFFFF'
  			},
  			ink: '#2D2C2A',
  			'muted-fg': '#544C37',
  			paper: '#FFFFFF',
  			canvas: '#E2DED2',
  			line: '#C9BCA9',
  			verified: '#2F7A4B',
  			flagged: '#B3311D',
  			caution: '#B4741C',
  			info: '#2A5F8F'
  		},
  		fontFamily: {
  			display: [
  				'var(--font-cormorant)',
  				'serif'
  			],
  			sans: [
  				'var(--font-outfit)',
  				'sans-serif'
  			],
  			mono: [
  				'var(--font-mono)',
  				'monospace'
  			]
  		},
  		fontSize: {
  			display: [
  				'48px',
  				{
  					lineHeight: '1.1',
  					fontWeight: '700'
  				}
  			],
  			h1: [
  				'32px',
  				{
  					lineHeight: '1.25',
  					fontWeight: '600'
  				}
  			],
  			h2: [
  				'24px',
  				{
  					lineHeight: '1.3',
  					fontWeight: '600'
  				}
  			],
  			h3: [
  				'18px',
  				{
  					lineHeight: '1.4',
  					fontWeight: '600'
  				}
  			],
  			body: [
  				'15px',
  				{
  					lineHeight: '1.6',
  					fontWeight: '400'
  				}
  			],
  			small: [
  				'13px',
  				{
  					lineHeight: '1.5',
  					fontWeight: '400'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem'
  		},
  		borderRadius: {
  			card: '8px',
  			control: '6px',
  			modal: '12px'
  		},
  		boxShadow: {
  			card: '0 1px 3px rgba(0,0,0,0.08)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
