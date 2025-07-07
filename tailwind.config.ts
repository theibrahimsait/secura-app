
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Secura brand colors
				'secura-black': 'hsl(var(--secura-black))',
				'secura-teal': 'hsl(var(--secura-teal))',
				'secura-moss': 'hsl(var(--secura-moss))',
				'secura-mint': 'hsl(var(--secura-mint))',
				'secura-lime': 'hsl(var(--secura-lime))',
				// Gradient text colors
				"color-1": "hsl(var(--color-1))",
				"color-2": "hsl(var(--color-2))",
				"color-3": "hsl(var(--color-3))",
				"color-4": "hsl(var(--color-4))",
				"color-5": "hsl(var(--color-5))",
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
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
				},
				"gradient-border": {
					"0%, 100%": { borderRadius: "37% 29% 27% 27% / 28% 25% 41% 37%" },
					"25%": { borderRadius: "47% 29% 39% 49% / 61% 19% 66% 26%" },
					"50%": { borderRadius: "57% 23% 47% 72% / 63% 17% 66% 33%" },
					"75%": { borderRadius: "28% 49% 29% 100% / 93% 20% 64% 25%" },
				},
				"gradient-1": {
					"0%, 100%": { top: "0", right: "0" },
					"50%": { top: "50%", right: "25%" },
					"75%": { top: "25%", right: "50%" },
				},
				"gradient-2": {
					"0%, 100%": { top: "0", left: "0" },
					"60%": { top: "75%", left: "25%" },
					"85%": { top: "50%", left: "50%" },
				},
				"gradient-3": {
					"0%, 100%": { bottom: "0", left: "0" },
					"40%": { bottom: "50%", left: "25%" },
					"65%": { bottom: "25%", left: "50%" },
				},
				"gradient-4": {
					"0%, 100%": { bottom: "0", right: "0" },
					"50%": { bottom: "25%", right: "40%" },
					"90%": { bottom: "50%", right: "25%" },
				},
				aurora: {
					from: {
						backgroundPosition: "50% 50%, 50% 50%",
					},
					to: {
						backgroundPosition: "350% 50%, 350% 50%",
					},
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				aurora: "aurora 60s linear infinite",
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
